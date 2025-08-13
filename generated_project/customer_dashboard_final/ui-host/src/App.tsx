import React, { useState, useCallback } from 'react'
import ChatInterface from './ChatInterface'

interface MCPClient {
  callTool(name: string, args: Record<string, any>): Promise<any>
}

// Mock MCP client for demonstration
const createMCPClient = (): MCPClient => {
  return {
    async callTool(name: string, args: Record<string, any>) {
      const response = await fetch('http://localhost:3002/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: { name, arguments: args }
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error.message || 'MCP call failed')
      }
      
      return data.result
    }
  }
}

function App() {
  const [uiResource, setUIResource] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const mcpClient = createMCPClient()
  
  // Handle postMessage from iframe for MCP tool invocations
  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object') {
        const msg = event.data
        
        switch (msg.type) {
          case 'mcp:ui.ready':
            console.log('UI ready signal received')
            // Send initial bootstrap data
            event.source?.postMessage({
              type: 'mcp:bootstrap',
              data: {
                // Could include initial data here
              }
            }, '*')
            break
            
          case 'mcp:tool.invoke':
            console.log('Tool invocation request:', msg)
            try {
              const result = await mcpClient.callTool(msg.tool, msg.params)
              event.source?.postMessage({
                type: 'mcp:tool.result',
                requestId: msg.requestId,
                result: result
              }, '*')
            } catch (error) {
              console.error('Tool invocation failed:', error)
              event.source?.postMessage({
                type: 'mcp:tool.error',
                requestId: msg.requestId,
                error: error instanceof Error ? error.message : 'Unknown error'
              }, '*')
            }
            break
        }
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [mcpClient])
  
  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Calling open-dashboard-ui tool...')
      const result = await mcpClient.callTool('open-dashboard-ui', {})
      console.log('MCP result:', result)
      
      // Extract resource from MCP response
      if (result.content && result.content[0]) {
        const content = result.content[0]
        if (content.type === 'text') {
          // Parse JSON text content
          const resourceData = JSON.parse(content.text)
          console.log('Parsed resource:', resourceData)
          
          // Extract the actual resource based on @mcp-ui/server format
          if (resourceData.type === 'resource' && resourceData.resource) {
            console.log('Setting resource:', resourceData.resource)
            setUIResource(resourceData.resource)
          } else {
            console.log('Setting full resource data:', resourceData)
            setUIResource(resourceData)
          }
        } else if (content.type === 'resource') {
          console.log('Direct resource:', content.resource)
          setUIResource(content.resource)
        } else {
          throw new Error('Unexpected content type: ' + content.type)
        }
      } else {
        throw new Error('No content in MCP response')
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])
  
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', display: 'flex', gap: '20px' }}>
      {/* Left Panel: Chat Interface */}
      <div style={{ flex: '1', minWidth: '400px' }}>
        <h1>🚀 Customer Dashboard AI</h1>
        <p>Chat-driven MCP UI with intelligent tool selection</p>
        
        <ChatInterface 
          mcpClient={mcpClient}
          onUIResourceLoad={(resource) => setUIResource(resource)}
        />
        
        <div style={{ marginTop: '16px' }}>
          <button 
            onClick={loadDashboard}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {loading ? '⏳ Loading...' : '🔧 Direct Load (Debug)'}
          </button>
        </div>
      </div>

      {/* Right Panel: UI Display */}
      <div style={{ flex: '2', minWidth: '600px' }}>
        <h2>🎨 Interactive UI</h2>
        
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            color: '#c00',
            marginBottom: '20px'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {uiResource ? (
          <div style={{
            border: '2px solid #007acc',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#fff'
          }}>
            <div style={{
              backgroundColor: '#007acc',
              color: 'white',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>🎨 {uiResource.uri}</span>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>
                {uiResource.mimeType}
              </span>
            </div>
            {uiResource.mimeType === 'text/html' && uiResource.text ? (
              <iframe
                srcDoc={uiResource.text}
                style={{ 
                  width: '100%', 
                  minHeight: '700px',
                  border: 'none'
                }}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
              <div style={{ padding: '20px', color: '#666' }}>
                Unsupported resource type: {uiResource.mimeType || 'unknown'}
                <pre style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '10px' }}>
                  {JSON.stringify(uiResource, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            color: '#999',
            border: '2px dashed #ddd',
            borderRadius: '8px',
            backgroundColor: '#fafafa'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#666' }}>Ready for AI Commands</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              チャットで「ダッシュボードを開いて」と話しかけると<br/>
              AIが自動でUIを表示します
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App