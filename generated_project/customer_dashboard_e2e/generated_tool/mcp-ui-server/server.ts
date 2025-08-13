/**
 * MCP UI Server
 * 
 * Dedicated MCP server that serves UI components as tools
 * Returns HTML/JS content with UI specifications for host-mediated integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// UI tool imports
import { uiItemDashboard } from './tools/ui.customer.dashboard.js';

class MCPUIServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "ui-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  private setupToolHandlers(): void {
    // Register UI tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "ui.item.dashboard",
            description: "Item management dashboard UI component with search and CRUD capabilities",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of items to load initially",
                  default: 20
                },
                preset: {
                  type: "string", 
                  description: "UI preset configuration",
                  default: "default"
                }
              },
              additionalProperties: false
            }
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "ui.item.dashboard":
            return await uiItemDashboard(args || {}) as any;

          default:
            throw new Error(`Unknown UI tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: "text",
              text: `Error executing UI tool ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        } as any;
      }
    });
  }

  private setupRequestHandlers(): void {
    // Handle server errors gracefully
    this.server.onerror = (error) => {
      console.error('[MCP UI Server] Error:', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('[MCP UI Server] Started successfully. Ready to serve UI components.');
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const uiServer = new MCPUIServer();
  uiServer.start().catch((error) => {
    console.error('[MCP UI Server] Failed to start:', error);
    process.exit(1);
  });
}

export { MCPUIServer };