#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import MCP tools
import { createItem } from './mcp-tools/createItem.js';
import { getItem } from './mcp-tools/getItem.js';
import { updateItem } from './mcp-tools/updateItem.js';
import { deleteItem } from './mcp-tools/deleteItem.js';
import { listItems } from './mcp-tools/listItems.js';

// Create MCP server
const server = new Server(
  {
    name: 'generated_tool',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Register tools
const tools = [
  createItem,
  getItem,
  updateItem,
  deleteItem,
  listItems
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
  } catch (error: any) {
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


// Register UI resources
server.setRequestHandler('resources/list', async () => {
  const resources = [];
  
  // Item UI resources
  resources.push(
    { uri: 'ui://item/create-form', name: 'Create Item Form', mimeType: 'text/html' },
    { uri: 'ui://item/edit-form', name: 'Edit Item Form', mimeType: 'text/html' },
    { uri: 'ui://item/list-view', name: 'Item List View', mimeType: 'text/html' },
    { uri: 'ui://item/detail-view', name: 'Item Detail View', mimeType: 'text/html' }
  );
  
  return { resources };
});

server.setRequestHandler('resources/read', async (request) => {
  const { uri } = request.params;
  
  // Map URI to file path
  const uriToFile = {
    'ui://item/create-form': 'ui-resources/item-create-form.html',
    'ui://item/edit-form': 'ui-resources/item-edit-form.html',
    'ui://item/list-view': 'ui-resources/item-list-view.html',
    'ui://item/detail-view': 'ui-resources/item-detail-view.html'
  };
  
  const filePath = uriToFile[uri];
  if (!filePath) {
    throw new Error(`Resource not found: ${uri}`);
  }
  
  const fs = await import('fs/promises');
  const path = await import('path');
  const content = await fs.readFile(path.join(process.cwd(), filePath), 'utf-8');
  
  return {
    contents: [{
      type: 'text',
      text: content,
      mimeType: 'text/html'
    }]
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('generated_tool MCP Server running');
}

main().catch(console.error);
