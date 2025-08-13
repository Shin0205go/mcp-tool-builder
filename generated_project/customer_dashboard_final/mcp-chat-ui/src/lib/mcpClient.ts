'use client'

export interface MCPRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: number
  result?: any
  error?: {
    code: number
    message: string
  }
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: any
}

export interface MCPServer {
  id: string
  name: string
  baseUrl: string
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  tools: MCPTool[]
}

export class MCPClient {
  private requestId = 1
  private servers: Map<string, MCPServer> = new Map()

  constructor(private serverConfigs: { id: string; name: string; baseUrl: string }[]) {
    this.initializeServers()
  }

  private async initializeServers() {
    for (const config of this.serverConfigs) {
      const server: MCPServer = {
        id: config.id,
        name: config.name,
        baseUrl: config.baseUrl,
        status: 'connecting',
        tools: []
      }
      
      this.servers.set(config.id, server)
      
      try {
        // Initialize server
        await this.sendRequest(config.id, 'initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: 'mcp-chat-ui',
            version: '1.0.0'
          }
        })

        // Get available tools
        const toolsResponse = await this.sendRequest(config.id, 'tools/list', {})
        server.tools = toolsResponse.tools || []
        server.status = 'connected'
        
        console.log(`✅ ${config.id}: Connected with ${server.tools.length} tools`)
      } catch (error) {
        console.error(`❌ ${config.id}: Connection failed`, error)
        server.status = 'error'
      }
    }
  }

  async sendRequest(serverId: string, method: string, params?: any): Promise<any> {
    const server = this.servers.get(serverId)
    if (!server) {
      throw new Error(`Server ${serverId} not found`)
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    }

    console.log(`📤 ${serverId}.${method}:`, request)

    const response = await fetch(`${server.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: MCPResponse = await response.json()
    
    console.log(`📥 ${serverId}.${method}:`, data)

    if (data.error) {
      throw new Error(`${data.error.code}: ${data.error.message}`)
    }

    return data.result
  }

  async callTool(serverId: string, toolName: string, args: any): Promise<any> {
    return this.sendRequest(serverId, 'tools/call', {
      name: toolName,
      arguments: args
    })
  }

  getServer(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId)
  }

  getAllServers(): MCPServer[] {
    return Array.from(this.servers.values())
  }

  getConnectedServers(): string[] {
    return Array.from(this.servers.values())
      .filter(server => server.status === 'connected')
      .map(server => server.id)
  }

  getAllTools(): { server: string; tool: MCPTool }[] {
    const tools: { server: string; tool: MCPTool }[] = []
    
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        for (const tool of server.tools) {
          tools.push({ server: server.id, tool })
        }
      }
    }
    
    return tools
  }

  async checkHealth(serverId: string): Promise<boolean> {
    try {
      const server = this.servers.get(serverId)
      if (!server) return false

      const response = await fetch(`${server.baseUrl}/health`)
      return response.ok
    } catch {
      return false
    }
  }

  async reconnectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId)
    if (!server) {
      throw new Error(`Server ${serverId} not found`)
    }

    server.status = 'connecting'
    server.tools = []

    try {
      await this.sendRequest(serverId, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'mcp-chat-ui', version: '1.0.0' }
      })

      const toolsResponse = await this.sendRequest(serverId, 'tools/list', {})
      server.tools = toolsResponse.tools || []
      server.status = 'connected'
    } catch (error) {
      server.status = 'error'
      throw error
    }
  }
}