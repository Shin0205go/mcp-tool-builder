/**
 * MCP Proxy Server
 * 
 * Bridges HTTP requests from web frontend to local MCP server via stdio.
 * Provides secure access to MCP tools and resources through JSON-RPC.
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;
const MCP_SERVER_PATH = process.env.MCP_SERVER_PATH || '../../../generated_project/customer_dashboard_final/dist/index.js';

// Security: Configure CORS for known origins only
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  
  // Filter out old requests
  const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  return true;
}

// MCP Server Connection Management
class MCPConnection {
  constructor(serverPath) {
    this.serverPath = serverPath;
    this.process = null;
    this.pendingRequests = new Map();
    this.buffer = '';
    this.isConnected = false;
  }
  
  async connect() {
    if (this.isConnected) return;
    
    console.log(`Starting MCP server from: ${this.serverPath}`);
    
    this.process = spawn('node', [this.serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    this.process.stdout.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });
    
    this.process.stderr.on('data', (data) => {
      console.error('MCP Server Error:', data.toString());
    });
    
    this.process.on('close', (code) => {
      console.log(`MCP server exited with code ${code}`);
      this.isConnected = false;
      
      // Reject all pending requests
      for (const [id, handler] of this.pendingRequests) {
        handler.reject(new Error('MCP server disconnected'));
      }
      this.pendingRequests.clear();
    });
    
    // Initialize connection
    await this.sendRequest('initialize', {
      protocolVersion: '1.0.0',
      capabilities: {},
      clientInfo: {
        name: 'mcp-proxy',
        version: '1.0.0'
      }
    });
    
    this.isConnected = true;
    console.log('MCP server connected successfully');
  }
  
  processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message = JSON.parse(line);
        
        if (message.id && this.pendingRequests.has(message.id)) {
          const handler = this.pendingRequests.get(message.id);
          this.pendingRequests.delete(message.id);
          
          if (message.error) {
            handler.reject(new Error(message.error.message || 'MCP error'));
          } else {
            handler.resolve(message.result);
          }
        }
      } catch (error) {
        console.error('Failed to parse MCP message:', error, 'Line:', line);
      }
    }
  }
  
  sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };
      
      this.pendingRequests.set(id, { resolve, reject });
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
      
      // Send request
      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }
  
  async disconnect() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isConnected = false;
    }
  }
}

// Initialize MCP connection
const mcp = new MCPConnection(MCP_SERVER_PATH);

// Ensure MCP is connected before handling requests
async function ensureConnected(req, res, next) {
  try {
    if (!mcp.isConnected) {
      await mcp.connect();
    }
    next();
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
    res.status(503).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32603,
        message: 'MCP server unavailable'
      }
    });
  }
}

// Main proxy endpoint
app.post('/mcp-proxy', ensureConnected, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Rate limiting
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32000,
        message: 'Rate limit exceeded'
      }
    });
  }
  
  const { method, params, id } = req.body;
  
  // Validate request
  if (!method || !id) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code: -32600,
        message: 'Invalid request'
      }
    });
  }
  
  // Security: Whitelist allowed methods
  const ALLOWED_METHODS = [
    'tools/list',
    'tools/call',
    'resources/list',
    'resources/read',
    'prompts/list',
    'prompts/get'
  ];
  
  if (!ALLOWED_METHODS.includes(method)) {
    return res.status(403).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: 'Method not allowed'
      }
    });
  }
  
  // Audit logging
  console.log(`[${new Date().toISOString()}] ${ip} -> ${method}`, 
    method === 'tools/call' ? `(${params?.name})` : '');
  
  try {
    const result = await mcp.sendRequest(method, params);
    
    res.json({
      jsonrpc: '2.0',
      id,
      result
    });
  } catch (error) {
    console.error(`Request failed: ${method}`, error);
    
    res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message || 'Internal error'
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mcp: {
      connected: mcp.isConnected,
      serverPath: MCP_SERVER_PATH
    },
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mcp.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await mcp.disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP Proxy Server running on port ${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`MCP server path: ${MCP_SERVER_PATH}`);
  
  // Pre-connect to MCP server
  mcp.connect().catch(console.error);
});