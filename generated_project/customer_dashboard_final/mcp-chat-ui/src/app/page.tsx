'use client'

import { useState, useEffect } from 'react'
import ChatPanel from '@/components/ChatPanel'
import Sidebar from '@/components/Sidebar'
import { MCPClient } from '@/lib/mcpClient'

export default function Home() {
  const [mcpClient] = useState(() => new MCPClient([
    {
      id: 'crm',
      name: 'CRM Server',
      baseUrl: 'http://localhost:8001'
    },
    {
      id: 'inventory',
      name: 'Inventory Server', 
      baseUrl: 'http://localhost:8002'
    }
  ]))

  const [servers, setServers] = useState(mcpClient.getAllServers())
  const [executionHistory, setExecutionHistory] = useState<Array<{
    id: string
    timestamp: Date
    server: string
    tool: string
    args: any
    result?: any
    error?: string
    duration: number
  }>>([])

  // Refresh server status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setServers([...mcpClient.getAllServers()])
    }, 2000)

    return () => clearInterval(interval)
  }, [mcpClient])

  const handleToolCall = async (server: string, tool: string, args: any) => {
    const startTime = Date.now()
    const executionId = `${Date.now()}-${Math.random()}`
    
    try {
      const result = await mcpClient.callTool(server, tool, args)
      const duration = Date.now() - startTime
      
      setExecutionHistory(prev => [...prev, {
        id: executionId,
        timestamp: new Date(),
        server,
        tool,
        args,
        result,
        duration
      }])
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setExecutionHistory(prev => [...prev, {
        id: executionId,
        timestamp: new Date(),
        server,
        tool,
        args,
        error: errorMessage,
        duration
      }])
      
      throw error
    }
  }

  const handleReconnect = async (serverId: string) => {
    try {
      await mcpClient.reconnectServer(serverId)
      setServers([...mcpClient.getAllServers()])
    } catch (error) {
      console.error(`Failed to reconnect to ${serverId}:`, error)
    }
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Main Chat Panel */}
      <div className="flex-1">
        <ChatPanel
          mcpServers={mcpClient.getConnectedServers()}
          onToolCall={handleToolCall}
        />
      </div>

      {/* Sidebar */}
      <Sidebar
        servers={servers}
        onReconnect={handleReconnect}
        executionHistory={executionHistory}
      />
    </div>
  )
}
