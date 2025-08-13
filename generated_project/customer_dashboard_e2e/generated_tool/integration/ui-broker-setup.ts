import { createUIToolBroker, type McpToolExecutor } from './ui-tool-broker.js';
import { createItem } from './mcp-tools/createItem.js';
import { getItem } from './mcp-tools/getItem.js';
import { updateItem } from './mcp-tools/updateItem.js';
import { deleteItem } from './mcp-tools/deleteItem.js';
import { listItems } from './mcp-tools/listItems.js';

// Tool executor implementation
const toolExecutor: McpToolExecutor = async (toolName, params, context) => {
  const toolMap: Record<string, any> = {
    'createItem': createItem,
    'getItem': getItem,
    'updateItem': updateItem,
    'deleteItem': deleteItem,
    'listItems': listItems
  };
  
  const tool = toolMap[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  return await tool.run(params, context);
};

// Create and configure broker
export const uiBroker = createUIToolBroker(toolExecutor, {
  allowedOrigin: 'http://localhost:3000',
  allowedTools: ['createItem', 'getItem', 'updateItem', 'deleteItem', 'listItems'],
  enableIdempotency: true,
  maxConcurrentJobs: 5,
  requestTimeoutMs: 30000
});

// Usage example:
// const iframe = document.querySelector('iframe');
// uiBroker.attachToIframe(iframe);
