# MCP Dashboard App - End-to-End Demo

This example demonstrates the complete flow of mounting an MCP-generated UI and enabling bidirectional communication between the UI and MCP tools.

## 🎯 What This Demonstrates

- **UI Mounting**: Loading MCP UI resources into an iframe
- **Needs Resolution**: Pre-fetching initial data before UI loads
- **Bootstrap Process**: Sending initial data to the UI
- **Tool Invocation**: UI calling MCP tools via postMessage
- **Security**: Origin validation, tool allowlisting, sandboxing

## 🚀 Quick Start

### 1. Build and Start the MCP Server

```bash
# Navigate to the final production-ready version
cd generated_project/customer_dashboard_final

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Start the MCP server (will run on stdio)
# Keep this terminal open
npm start
```

### 2. Start the Proxy Server

```bash
# In a new terminal
cd packages/mcp-proxy

# Install dependencies
npm install

# Start the proxy server (default port 3001)
npm start
```

You should see:
```
MCP Proxy Server running on port 3001
Allowed origins: http://localhost:3000
MCP server connected successfully
```

### 3. Open the Dashboard App

```bash
# In a new terminal
cd examples/dashboard-app

# Option 1: Open directly in browser (file://)
open index.html  # macOS
# or
xdg-open index.html  # Linux

# Option 2: Serve with a local web server (recommended)
npx serve .
# Then open http://localhost:3000
```

### 4. Mount the Dashboard

1. Click the **"📊 Mount Dashboard"** button
2. The UI will load and display the Customer Dashboard
3. You'll see initial data loaded (from the `needs` resolution)
4. Try the following interactions:
   - Click "Refresh List" to fetch customers
   - Fill the form and click "Create Customer"
   - Click view/edit/delete buttons in the list

## 🔍 What's Happening

### Communication Flow

```
Browser App
    ↓ (mountUi)
Host SDK
    ↓ (readResource)
Proxy Server
    ↓ (JSON-RPC)
MCP Server
    ↓ (resources/read)
Dashboard HTML
    ↓
iframe (sandboxed)
    ↓ (postMessage: ready)
Host SDK
    ↓ (needs resolution)
Proxy → MCP (tools/call)
    ↓
Bootstrap Data
    ↓ (postMessage: bootstrap)
UI Initialized
    ↓
User Interaction
    ↓ (postMessage: invoke)
Host SDK (broker)
    ↓
Proxy → MCP (tools/call)
    ↓
Result
    ↓ (postMessage: result)
UI Updated
```

### Security Features

1. **Sandboxed iframe**: `allow-scripts allow-forms` only
2. **Origin Validation**: Messages verified against expected origin
3. **Tool Allowlist**: Only permitted tools can be invoked
4. **Request Timeout**: 15-second timeout on all tool calls
5. **Rate Limiting**: Proxy server limits requests per IP
6. **Audit Logging**: All operations logged with request IDs

## 🛠️ Troubleshooting

### "Failed to mount dashboard"

1. Check MCP server is running:
   ```bash
   ps aux | grep "customer_dashboard_final"
   ```

2. Check proxy server is running:
   ```bash
   curl http://localhost:3001/health
   ```

3. Check browser console for detailed errors

### "Tool not allowed"

The tool allowlist in `index.html` controls which tools the UI can invoke. Add tool names to the `allowTools` array.

### CORS Issues

If serving from a different port, update the proxy server's `ALLOWED_ORIGINS`:

```bash
ALLOWED_ORIGINS=http://localhost:5000 npm start
```

## 📝 Configuration

### Proxy Server Environment Variables

```bash
PORT=3001                    # Proxy server port
MCP_SERVER_PATH=../../path   # Path to MCP server
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

### Dashboard App Settings

Edit these in `index.html`:

- **Proxy URL**: Where the proxy server is running
- **UI Resource**: The MCP resource URI to load
- **Needs**: Initial data to fetch before UI loads
- **Allow Tools**: Which tools the UI can invoke

## 🎨 Customization

### Adding More Tools to Allowlist

```javascript
allowTools: [
  'listcustomers',
  'createcustomer',
  'getcustomer',
  'updatecustomer', 
  'deletecustomer',
  'searchcustomers',  // Add new tools here
  'exportcustomers'
]
```

### Pre-fetching More Data

```javascript
needs: [
  { tool: 'listcustomers', params: { page: 1, limit: 10 } },
  { tool: 'getcustomerstats', params: {} },  // Add more needs
  { tool: 'getusersettings', params: {} }
]
```

### Custom Styling

The dashboard UI styling is embedded in the generated HTML. To customize, modify the template at:
`src/templates/resources/dashboard.ts.ejs`

## 🔐 Production Deployment

For production use:

1. **Use HTTPS**: Serve everything over HTTPS
2. **Fix Origins**: No wildcards, use specific origins
3. **Add Authentication**: Implement proper auth in proxy
4. **Use CSP Headers**: Add Content-Security-Policy
5. **Monitor & Limit**: Add rate limiting and monitoring
6. **Audit Everything**: Log all tool invocations

## 📚 Next Steps

- Add authentication to the proxy server
- Implement WebSocket support for real-time updates
- Create more sophisticated UI components
- Add state management (Redux/Zustand)
- Build a React/Vue/Angular wrapper for the Host SDK

## 🎉 Success Checklist

✅ MCP server generates and serves UI resources  
✅ Proxy server bridges HTTP to stdio MCP protocol  
✅ Host SDK mounts UI and manages communication  
✅ UI sends ready signal and receives bootstrap data  
✅ User interactions trigger tool invocations  
✅ Results flow back and update the UI  
✅ Full security model implemented  

**Congratulations!** You've successfully implemented the complete MCP UI mounting and tool invocation flow! 🚀