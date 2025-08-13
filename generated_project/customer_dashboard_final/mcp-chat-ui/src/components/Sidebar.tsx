'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Server, Zap, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import type { MCPServer } from '@/lib/mcpClient'

interface SidebarProps {
  servers: MCPServer[]
  onReconnect: (serverId: string) => Promise<void>
  executionHistory: Array<{
    id: string
    timestamp: Date
    server: string
    tool: string
    args: any
    result?: any
    error?: string
    duration: number
  }>
}

export default function Sidebar({ servers, onReconnect, executionHistory }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    servers: true,
    history: true
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getStatusIcon = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'connecting':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      case 'disconnected':
        return <AlertCircle className="w-4 h-4 text-gray-400" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800'
      case 'connecting':
        return 'bg-blue-100 text-blue-800'
      case 'disconnected':
        return 'bg-gray-100 text-gray-800'
      case 'error':
        return 'bg-red-100 text-red-800'
    }
  }

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Status & History</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Servers Section */}
        <div>
          <button
            onClick={() => toggleSection('servers')}
            className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {expandedSections.servers ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Server className="w-4 h-4" />
            MCP Servers ({servers.length})
          </button>

          {expandedSections.servers && (
            <div className="mt-3 space-y-2">
              {servers.map(server => (
                <div key={server.id} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(server.status)}
                    <span className="font-medium text-gray-900">{server.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(server.status)}`}>
                      {server.status}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    {server.baseUrl}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {server.tools.length} tools
                    </span>
                    
                    {server.status === 'error' && (
                      <button
                        onClick={() => onReconnect(server.id)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        Reconnect
                      </button>
                    )}
                  </div>

                  {/* Tools list */}
                  {server.tools.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs font-medium text-gray-600">Available Tools:</div>
                      {server.tools.map(tool => (
                        <div key={tool.name} className="text-xs text-gray-500 pl-2">
                          • {tool.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Execution History Section */}
        <div>
          <button
            onClick={() => toggleSection('history')}
            className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {expandedSections.history ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Clock className="w-4 h-4" />
            Execution History ({executionHistory.length})
          </button>

          {expandedSections.history && (
            <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
              {executionHistory.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No executions yet</div>
              ) : (
                executionHistory.slice().reverse().map(execution => (
                  <div key={execution.id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-3 h-3 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {execution.server}.{execution.tool}
                      </span>
                      {execution.error ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                          Error
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          Success
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-600 mb-1">
                      {execution.timestamp.toLocaleTimeString()} ({execution.duration}ms)
                    </div>

                    {execution.error ? (
                      <div className="text-xs text-red-600">
                        {execution.error}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        Arguments: {JSON.stringify(execution.args)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {servers.filter(s => s.status === 'connected').length}
            </div>
            <div className="text-xs text-gray-600">Connected</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {executionHistory.filter(e => !e.error).length}
            </div>
            <div className="text-xs text-gray-600">Successful</div>
          </div>
        </div>
      </div>
    </div>
  )
}