import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Safe schema generation helper
function safeZodToJsonSchema(zodSchema: any): any {
  try {
    return zodToJsonSchema(zodSchema, { 
      $refStrategy: 'none',
      errorMessages: true 
    });
  } catch (error) {
    console.error('Schema generation failed:', error);
    return { 
      type: 'object', 
      additionalProperties: true,
      description: 'Schema generation failed - accepting any object'
    };
  }
}
import { handlers } from './generated/handlers.js';
import type { ToolSpec } from './generated/types.js';
import { buildDashboardHtml } from './generated/resources/dashboard.js';
import { SERVER_INFO, CAPABILITIES, ERROR_SCHEMA } from './generated/constants.js';

const server = new Server(SERVER_INFO, { capabilities: CAPABILITIES });

// tools/list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Object.entries(handlers).map(([name, h]) => {
    try {
      // Safe schema generation with fallback
      const inputSchema = safeZodToJsonSchema(h.Input);

      return {
        name,
        description: `Tool for ${name}`,
        inputSchema
      };
    } catch (error) {
      console.error(`Error processing tool ${name}:`, error);
      return {
        name,
        description: `Tool for ${name}`,
        inputSchema: { type: 'object', additionalProperties: true }
      };
    }
  });
  return { tools };
});

function normalizeArgs(params: any): any {
  return params?.arguments ?? params?.args ?? params ?? {};
}

// Generate unique request ID for tracing
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Audit log helper
function auditLog(level: 'info' | 'error', requestId: string, toolName: string, message: string, details?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    requestId, 
    toolName,
    message,
    ...(details && { details })
  };
  console.log(JSON.stringify(logEntry));
}

// call_tool - Type-safe tool invocation with audit logging
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const requestId = generateRequestId();
  const name = req.params.name as keyof ToolSpec;
  
  auditLog('info', requestId, String(name), 'Tool invocation started');
  
  try {
    const h = handlers[name];
    if (!h) {
      auditLog('error', requestId, String(name), 'Unknown tool');
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            code: 404,
            message: `Tool '${String(name)}' not found`,
            details: { availableTools: Object.keys(handlers) }
          }, null, 2) 
        }] 
      };
    }
    
    // Type-safe parsing and execution
    const Input = h.Input as any;
    const parsed = Input.parse(normalizeArgs(req.params));
    
    auditLog('info', requestId, String(name), 'Tool execution started', { params: parsed });
    
    const result = await h.run(parsed, { userId: 'system', requestId });
    
    auditLog('info', requestId, String(name), 'Tool execution completed');
    
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify(result, null, 2) 
      }] 
    };
    
  } catch (error: any) {
    auditLog('error', requestId, String(name), 'Tool execution failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    // Standard error response format
    const errorResponse = {
      code: error.code || 500,
      message: error.message || 'Internal server error',
      details: {
        requestId,
        toolName: String(name),
        timestamp: new Date().toISOString()
      }
    };
    
    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify(errorResponse, null, 2) 
      }] 
    };
  }
});

// resources/list
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [{
    uri: 'ui://customerdashboard/dashboard',
    name: 'CustomerDashboard Dashboard', 
    description: 'Main dashboard UI',
    mimeType: 'text/html'
  }]
}));

// resources/read  
server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  if (req.params.uri !== 'ui://customerdashboard/dashboard') {
    throw new Error('Unknown resource');
  }
  
  return {
    contents: [{
      uri: req.params.uri,
      mimeType: 'text/html',
      text: buildDashboardHtml()
    }]
  };
});

// prompts/list
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [{
    name: 'open-dashboard',
    description: 'Open CustomerDashboard dashboard'
  }]
}));

// prompts/get
server.setRequestHandler(GetPromptRequestSchema, async (req) => {
  if (req.params.name !== 'open-dashboard') {
    throw new Error('Unknown prompt');
  }
  
  return {
    description: 'Open CustomerDashboard dashboard',
    messages: [{
      role: 'assistant',
      content: [{
        type: 'resource',
        resource: {
          uri: 'ui://customerdashboard/dashboard',
          text: 'Dashboard opened'
        }
      }]
    }]
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { server };