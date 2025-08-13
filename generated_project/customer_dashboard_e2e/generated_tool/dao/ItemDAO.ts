import { Pool } from 'pg';
import { 
  Item,
  CreateItemInput,
  UpdateItemInput,
  type ItemType
} from '../schemas/item.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Item Data Access Object
 * Direct SQL queries for Item operations
 */
export class ItemDAO {
  
  /**
   * Create a new Item
   */
  async create(data: typeof CreateItemInput._type): Promise<ItemType> {
    const validated = CreateItemInput.parse(data);
    const fields = Object.keys(validated);
    const values = Object.values(validated);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO "item" (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return Item.parse(result.rows[0]);
  }
  
  /**
   * Find Item by ID
   */
  async findById(id: string): Promise<ItemType | null> {
    const query = 'SELECT * FROM "item" WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return Item.parse(result.rows[0]);
  }
  
  /**
   * Find all Items with filters
   */
  async findAll(filters: Record<string, any> = {}): Promise<ItemType[]> {
    let query = 'SELECT * FROM "item" WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        paramCount++;
        query += ` AND ${key} = $${paramCount}`;
        values.push(value);
      }
    });
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, values);
    return result.rows.map(row => Item.parse(row));
  }
  
  /**
   * Update Item
   */
  async update(id: string, data: typeof UpdateItemInput._type): Promise<ItemType | null> {
    const validated = UpdateItemInput.parse(data);
    const fields = Object.keys(validated);
    const values = Object.values(validated);
    
    if (fields.length === 0) {
      return this.findById(id);
    }
    
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    
    const query = `
      UPDATE "item"
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, ...values]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return Item.parse(result.rows[0]);
  }
  
  /**
   * Delete Item
   */
  async delete(id: string): Promise<ItemType | null> {
    const query = 'DELETE FROM "item" WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return Item.parse(result.rows[0]);
  }
  
  /**
   * Get statistics for Item
   */
  async getStats(): Promise<Record<string, any>> {
    const countQuery = 'SELECT COUNT(*) as total FROM "item"';
    const countResult = await pool.query(countQuery);
    
    const stats: Record<string, any> = {
      total: parseInt(countResult.rows[0].total)
    };
    
    // Add numeric field averages

    
    return stats;
  }
}