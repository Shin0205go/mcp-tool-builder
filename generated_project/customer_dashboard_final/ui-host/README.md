# Customer Dashboard UI Host

React/Vite host application for MCP UI resources using `@mcp-ui/client`.

## Architecture

```
┌─────────────────┐    HTTP     ┌──────────────┐    stdio    ┌─────────────┐
│   React App     │───────────→│  MCP Proxy   │───────────→│ MCP Server  │
│ UIResourceRenderer│            │  (HTTP→stdio)│             │ (Node.js)   │
└─────────────────┘            └──────────────┘             └─────────────┘
    @mcp-ui/client                                           @mcp-ui/server
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start MCP proxy server:**
   ```bash
   node mcp-proxy.js
   ```

3. **Start React dev server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:3001` and click "Load Dashboard"

## Features

- ✅ **@mcp-ui/client integration**: Standard MCP UI resource rendering
- ✅ **UIResourceRenderer**: Automatic iframe sandboxing for rawHtml
- ✅ **HTTP→stdio bridge**: Connects web UI to MCP server
- ✅ **Real-time dashboard**: Live customer data with CRUD operations
- ✅ **Cross-origin support**: CORS-enabled for development

## MCP UI Resource Types

The server supports:
- **rawHtml**: Full HTML dashboard (current implementation)
- **externalUrl**: External website embedding
- **remoteDom**: Dynamic DOM manipulation

## Environment

- **React 18** + **Vite** for fast development
- **TypeScript** for type safety
- **@mcp-ui/client ^5.2.0** for standardized rendering
- **MCP Server** on stdio transport

Built with [mcp-tool-builder](https://github.com/your-org/mcp-tool-builder) 🚀