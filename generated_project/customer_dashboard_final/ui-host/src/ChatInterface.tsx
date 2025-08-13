import React, { useState, useCallback, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  uiResource?: any
}

interface ChatInterfaceProps {
  mcpClient: any
  onUIResourceLoad: (resource: any) => void
}

// Mock AI/LLM client for demonstration
const mockAIClient = {
  async chat(messages: Message[]): Promise<{ content: string; toolCalls?: any[] }> {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase()
    
    // Simple keyword-based AI simulation
    if (lastMessage.includes('dashboard') || lastMessage.includes('顧客') || lastMessage.includes('customer')) {
      return {
        content: 'カスタマーダッシュボードを開きます。',
        toolCalls: [{ name: 'open-dashboard-ui', arguments: {} }]
      }
    }
    
    if (lastMessage.includes('list') || lastMessage.includes('一覧') || lastMessage.includes('show customers')) {
      return {
        content: '顧客一覧を表示します。',
        toolCalls: [{ name: 'list-customers', arguments: { page: 1, limit: 10 } }]
      }
    }
    
    if (lastMessage.includes('create') || lastMessage.includes('新規') || lastMessage.includes('add customer')) {
      return {
        content: '新しい顧客を作成するフォームを表示します。',
        toolCalls: [{ name: 'open-dashboard-ui', arguments: {} }]
      }
    }
    
    return {
      content: `"${lastMessage}"について理解しました。\n\n利用可能なコマンド:\n- "ダッシュボードを開いて" - UIを表示\n- "顧客一覧を見せて" - 顧客データを表示\n- "新規顧客を作成" - 作成フォームを表示`
    }
  }
}

export function ChatInterface({ mcpClient, onUIResourceLoad }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'こんにちは！カスタマーダッシュボードのAIアシスタントです。\n\n何をお手伝いしましょうか？\n- ダッシュボードを開く\n- 顧客一覧を表示\n- 新規顧客を作成',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Call AI/LLM
      const aiResponse = await mockAIClient.chat([...messages, userMessage])
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date()
      }

      // Execute tool calls if any
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        for (const toolCall of aiResponse.toolCalls) {
          try {
            console.log('Executing tool call:', toolCall)
            const result = await mcpClient.callTool(toolCall.name, toolCall.arguments)
            
            // Handle UI resource tools specially
            if (toolCall.name === 'open-dashboard-ui' && result.content?.[0]) {
              const content = result.content[0]
              if (content.type === 'text') {
                const resourceData = JSON.parse(content.text)
                if (resourceData.type === 'resource' && resourceData.resource) {
                  assistantMessage.uiResource = resourceData.resource
                  onUIResourceLoad(resourceData.resource)
                  assistantMessage.content += '\n\n✅ ダッシュボードUIを表示しました。'
                }
              }
            } else if (toolCall.name === 'list-customers') {
              // Handle data display tools
              assistantMessage.content += `\n\n📊 データを取得しました:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
            }
          } catch (error) {
            console.error('Tool execution failed:', error)
            assistantMessage.content += `\n\n❌ ツール実行エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI chat failed:', error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `申し訳ありません。エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, mcpClient, onUIResourceLoad])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '600px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#fff'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #eee',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px 8px 0 0'
      }}>
        <h3 style={{ margin: 0, color: '#333' }}>🤖 Customer Dashboard AI</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
          MCP-powered AI assistant with UI capabilities
        </p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: '16px',
              backgroundColor: msg.role === 'user' ? '#007acc' : '#f1f3f4',
              color: msg.role === 'user' ? 'white' : '#333',
              fontSize: '14px',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap'
            }}
          >
            {msg.content}
            {msg.uiResource && (
              <div style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                🎨 UI Resource: {msg.uiResource.uri}
              </div>
            )}
            <div style={{
              fontSize: '10px',
              opacity: 0.7,
              marginTop: '4px'
            }}>
              {msg.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '12px 16px',
            borderRadius: '16px',
            backgroundColor: '#f1f3f4',
            color: '#666',
            fontSize: '14px'
          }}>
            <span>💭 思考中...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #eee',
        display: 'flex',
        gap: '8px'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="メッセージを入力... (例: ダッシュボードを開いて)"
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '20px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 20px',
            backgroundColor: loading ? '#ccc' : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳' : '送信'}
        </button>
      </div>
    </div>
  )
}

export default ChatInterface