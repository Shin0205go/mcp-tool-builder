import { ItemDAO } from '../dao/ItemDAO.js';
import { 
  CreateItemInput,
  CreateItemOutput
} from '../schemas/item.js';
import type { McpTool } from '../types/mcp.js';

/**
 * Get a item by ID
 */
export const getItem: McpTool<
  typeof CreateItemInput, 
  typeof CreateItemOutput
> = {
  name: 'getItem',
  description: 'Get a item by ID',
  inputSchema: CreateItemInput,
  outputSchema: CreateItemOutput,
  
  async run(input, ctx) {
    const dao = new ItemDAO();
    
    try {
      // Validate input
      const validated = CreateItemInput.parse(input);
      
      // Execute operation
      const result = await dao.create(validated);
        return result;
      
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }
};