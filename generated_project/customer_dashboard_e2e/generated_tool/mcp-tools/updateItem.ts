import { ItemDAO } from '../dao/ItemDAO.js';
import { 
  UpdateItemInput,
  UpdateItemOutput
} from '../schemas/item.js';
import type { McpTool } from '../types/mcp.js';

/**
 * Update a item
 */
export const updateItem: McpTool<
  typeof UpdateItemInput, 
  typeof UpdateItemOutput
> = {
  name: 'updateItem',
  description: 'Update a item',
  inputSchema: UpdateItemInput,
  outputSchema: UpdateItemOutput,
  
  async run(input, ctx) {
    const dao = new ItemDAO();
    
    try {
      // Validate input
      const validated = UpdateItemInput.parse(input);
      
      // Execute operation
      const { id, ...updateData } = validated;
        const result = await dao.update(id, updateData);
        if (!result) {
          throw new Error('Item not found');
        }
        return result;
      
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }
};