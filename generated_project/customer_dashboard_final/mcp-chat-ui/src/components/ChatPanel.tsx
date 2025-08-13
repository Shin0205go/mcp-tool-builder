'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Server, Zap } from 'lucide-react'
import DynamicRenderer from './DynamicRenderer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
  results?: any[]
}

interface ToolCall {
  server: string
  tool: string
  args: any
  status: 'pending' | 'success' | 'error'
  result?: any
  error?: string
}

interface ChatPanelProps {
  mcpServers: string[]
  onToolCall: (server: string, tool: string, args: any) => Promise<any>
}

export default function ChatPanel({ mcpServers, onToolCall }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '🚀 MCP Chat UI にようこそ！自然言語でツールを実行できます。\n\n例:\n• "Acmeの顧客一覧を表示して"\n• "在庫の少ない商品をチェックして"\n• "新しい顧客を追加したい"',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)

    try {
      // This is where we'd integrate with LLM to parse natural language
      // and convert to MCP tool calls. For now, simple keyword matching
      const response = await processUserInput(input.trim(), onToolCall)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        toolCalls: response.toolCalls,
        results: response.results
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          MCP Chat Interface
        </h2>
        <div className="flex items-center gap-2 mt-2">
          {mcpServers.map(server => (
            <span key={server} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
              <Server className="w-3 h-3" />
              {server}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={`flex-1 max-w-md ${message.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block p-3 rounded-lg whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}>
                {message.content}
              </div>
              
              {/* Tool Calls Display */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.toolCalls.map((toolCall, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium">{toolCall.server}.{toolCall.tool}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          toolCall.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : toolCall.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {toolCall.status}
                        </span>
                      </div>
                      {toolCall.error && (
                        <div className="mt-1 text-red-600 text-sm">{toolCall.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Results Display */}
              {message.results && message.results.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.results.map((result, index) => {
                    const toolCall = message.toolCalls?.[index]
                    return (
                      <DynamicRenderer 
                        key={index}
                        data={result}
                        toolName={toolCall?.tool || 'unknown'}
                        serverName={toolCall?.server || 'unknown'}
                      />
                    )
                  })}
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="inline-block p-3 bg-gray-100 rounded-lg rounded-bl-none">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="自然言語でMCPツールを実行..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            送信
          </button>
        </form>
      </div>
    </div>
  )
}

// Simple natural language processing (this would be replaced with proper LLM integration)
async function processUserInput(input: string, onToolCall: (server: string, tool: string, args: any) => Promise<any>) {
  const lowerInput = input.toLowerCase()
  
  // Simple keyword matching for demo purposes
  if (lowerInput.includes('顧客') || lowerInput.includes('customer')) {
    if (lowerInput.includes('一覧') || lowerInput.includes('リスト') || lowerInput.includes('表示')) {
      try {
        const result = await onToolCall('crm', 'list-customers', { limit: 10 })
        return {
          content: '顧客一覧を取得しました:',
          toolCalls: [{
            server: 'crm',
            tool: 'list-customers',
            args: { limit: 10 },
            status: 'success' as const,
            result
          }],
          results: [result]
        }
      } catch (error) {
        return {
          content: '顧客一覧の取得に失敗しました',
          toolCalls: [{
            server: 'crm',
            tool: 'list-customers',
            args: { limit: 10 },
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          }],
          results: []
        }
      }
    }
  }
  
  if (lowerInput.includes('在庫') || lowerInput.includes('stock') || lowerInput.includes('inventory')) {
    if (lowerInput.includes('少ない') || lowerInput.includes('低い') || lowerInput.includes('low')) {
      try {
        const result = await onToolCall('inventory', 'list-low-stock', {})
        return {
          content: '在庫の少ない商品を取得しました:',
          toolCalls: [{
            server: 'inventory',
            tool: 'list-low-stock',
            args: {},
            status: 'success' as const,
            result
          }],
          results: [result]
        }
      } catch (error) {
        return {
          content: '在庫情報の取得に失敗しました',
          toolCalls: [{
            server: 'inventory',
            tool: 'list-low-stock',
            args: {},
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          }],
          results: []
        }
      }
    } else if (lowerInput.includes('一覧') || lowerInput.includes('商品')) {
      try {
        const result = await onToolCall('inventory', 'list-products', {})
        return {
          content: '商品一覧を取得しました:',
          toolCalls: [{
            server: 'inventory',
            tool: 'list-products',
            args: {},
            status: 'success' as const,
            result
          }],
          results: [result]
        }
      } catch (error) {
        return {
          content: '商品一覧の取得に失敗しました',
          toolCalls: [{
            server: 'inventory',
            tool: 'list-products',
            args: {},
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          }],
          results: []
        }
      }
    }
  }
  
  return {
    content: `申し訳ございませんが、「${input}」の内容を理解できませんでした。\n\n以下のような質問をお試しください:\n• "顧客一覧を表示して"\n• "在庫の少ない商品をチェックして"\n• "商品一覧を見せて"`,
    toolCalls: [],
    results: []
  }
}