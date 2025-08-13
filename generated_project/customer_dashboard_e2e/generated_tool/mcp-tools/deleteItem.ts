import { ItemDAO } from '../dao/ItemDAO.js';
import { 
  CreateItemInput,
  DeleteResult
} from '../schemas/item.js';
import type { McpTool } from '../types/mcp.js';

/**
 * Delete a item
 */
export const deleteItem: McpTool<
  typeof CreateItemInput, 
  typeof DeleteResult
> = {
  name: 'deleteItem',
  description: 'Delete a item',
  inputSchema: CreateItemInput,
  outputSchema: DeleteResult,
  
  async run(input, ctx) {
    const dao = new ItemDAO();
    
    try {
      // Validate input
      const validated = CreateItemInput.parse(input);
      
      // Execute operation
      const result = await dao.delete(validated.id);
        if (!result) {
          throw new Error('Item not found');
        }
        return { success: true };
      
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }
};