import { spawn } from 'child_process'
import http from 'http'
import { URL } from 'url'

const MCP_SERVER_PATH = '../dist/index.js'
const PORT = 3002

// Create HTTP server that proxies to MCP stdio server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }
  
  if (req.method !== 'POST' || req.url !== '/mcp') {
    res.writeHead(404)
    res.end('Not Found')
    return
  }
  
  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', () => {
    try {
      const jsonRequest = JSON.parse(body)
      console.error('MCP Request:', JSON.stringify(jsonRequest, null, 2))
      
      // Spawn MCP server process
      const mcpProcess = spawn('node', [MCP_SERVER_PATH], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL || 'postgresql://app:apppw@localhost:5433/customer_dashboard?sslmode=disable'
        }
      })
      
      let mcpResponse = ''
      let mcpError = ''
      
      mcpProcess.stdout.on('data', data => {
        mcpResponse += data.toString()
      })
      
      mcpProcess.stderr.on('data', data => {
        mcpError += data.toString()
      })
      
      mcpProcess.on('close', code => {
        if (mcpError) {
          console.error('MCP stderr:', mcpError)
        }
        
        try {
          const response = JSON.parse(mcpResponse)
          console.error('MCP Response:', JSON.stringify(response, null, 2))
          
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(response))
        } catch (parseError) {
          console.error('Failed to parse MCP response:', parseError)
          console.error('Raw response:', mcpResponse)
          
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: jsonRequest.id,
            error: {
              code: -32603,
              message: 'Internal error: Failed to parse MCP response'
            }
          }))
        }
      })
      
      // Send request to MCP server
      mcpProcess.stdin.write(JSON.stringify(jsonRequest) + '\n')
      mcpProcess.stdin.end()
      
    } catch (error) {
      console.error('Request parsing error:', error)
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error'
        }
      }))
    }
  })
})

server.listen(PORT, () => {
  console.log(`🌉 MCP HTTP Proxy running on http://localhost:${PORT}`)
  console.log(`🔗 Proxying to MCP server: ${MCP_SERVER_PATH}`)
})