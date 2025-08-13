import { CreateCustomerInput, UpdateCustomerInput, type CustomerType } from '../schemas/customer.js';
/**
 * Customer Data Access Object
 * Direct SQL queries for Customer operations
 */
export declare class CustomerDAO {
    /**
     * Create a new Customer
     */
    create(data: typeof CreateCustomerInput._type): Promise<CustomerType>;
    /**
     * Find Customer by ID
     */
    findById(id: string): Promise<CustomerType | null>;
    /**
     * Find all Customers with filters
     */
    findAll(filters?: Record<string, any>): Promise<CustomerType[]>;
    /**
     * Update Customer
     */
    update(id: string, data: typeof UpdateCustomerInput._type): Promise<CustomerType | null>;
    /**
     * Delete Customer
     */
    delete(id: string): Promise<CustomerType | null>;
    /**
     * Get statistics for Customer
     */
    getStats(): Promise<Record<string, any>>;
}
//# sourceMappingURL=CustomerDAO.d.ts.map