#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Import MCP tools
import { createCustomer } from './mcp-tools/createCustomer.js';
// Create MCP server
const server = new Server({
    name: 'generated_tool',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Register tools
const tools = [
    createCustomer
];
server.setRequestHandler('tools/list', async () => ({
    tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
    }))
}));
server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;
    const tool = tools.find(t => t.name === name);
    if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
    }
    try {
        const result = await tool.run(args || {}, {});
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                }],
        };
    }
    catch (error) {
        console.error(`Error in ${name}:`, error);
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error.message
                    }, null, 2),
                }],
            isError: true,
        };
    }
});
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('generated_tool MCP Server running');
}
main().catch(console.error);
//# sourceMappingURL=index.js.map