import { ItemDAO } from '../dao/ItemDAO.js';
import { 
  ListItemInput,
  ListItemOutput
} from '../schemas/item.js';
import type { McpTool } from '../types/mcp.js';

/**
 * List all items
 */
export const listItems: McpTool<
  typeof ListItemInput, 
  typeof ListItemOutput
> = {
  name: 'listItems',
  description: 'List all items',
  inputSchema: ListItemInput,
  outputSchema: ListItemOutput,
  
  async run(input, ctx) {
    const dao = new ItemDAO();
    
    try {
      // Validate input
      const validated = ListItemInput.parse(input);
      
      // Execute operation
      const { page, limit, sortBy, order, ...filters } = validated;
        const items = await dao.findAll(filters);
        return {
          items,
          total: items.length,
          page,
          limit
        };
      
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }
};