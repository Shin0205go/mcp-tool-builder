import { Pool } from 'pg';
import { Customer, CreateCustomerInput, UpdateCustomerInput } from '../schemas/customer.js';
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});
/**
 * Customer Data Access Object
 * Direct SQL queries for Customer operations
 */
export class CustomerDAO {
    /**
     * Create a new Customer
     */
    async create(data) {
        const validated = CreateCustomerInput.parse(data);
        const fields = Object.keys(validated);
        const values = Object.values(validated);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
      INSERT INTO "customer" (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
        const result = await pool.query(query, values);
        return Customer.parse(result.rows[0]);
    }
    /**
     * Find Customer by ID
     */
    async findById(id) {
        const query = 'SELECT * FROM "customer" WHERE id = $1';
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return Customer.parse(result.rows[0]);
    }
    /**
     * Find all Customers with filters
     */
    async findAll(filters = {}) {
        let query = 'SELECT * FROM "customer" WHERE 1=1';
        const values = [];
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
        return result.rows.map(row => Customer.parse(row));
    }
    /**
     * Update Customer
     */
    async update(id, data) {
        const validated = UpdateCustomerInput.parse(data);
        const fields = Object.keys(validated);
        const values = Object.values(validated);
        if (fields.length === 0) {
            return this.findById(id);
        }
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const query = `
      UPDATE "customer"
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
        const result = await pool.query(query, [id, ...values]);
        if (result.rows.length === 0) {
            return null;
        }
        return Customer.parse(result.rows[0]);
    }
    /**
     * Delete Customer
     */
    async delete(id) {
        const query = 'DELETE FROM "customer" WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return Customer.parse(result.rows[0]);
    }
    /**
     * Get statistics for Customer
     */
    async getStats() {
        const countQuery = 'SELECT COUNT(*) as total FROM "customer"';
        const countResult = await pool.query(countQuery);
        const stats = {
            total: parseInt(countResult.rows[0].total)
        };
        // Add numeric field averages
        return stats;
    }
}
//# sourceMappingURL=CustomerDAO.js.map