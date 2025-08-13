import { type CreateCustomerInputType, type CreateCustomerOutputType } from '../schemas/customer.js';
/**
 * Create a new customer - Business Logic
 */
export declare function createCustomer(input: CreateCustomerInputType, context?: {
    userId?: string;
    idempotencyKey?: string;
}): Promise<CreateCustomerOutputType>;
//# sourceMappingURL=createCustomer.d.ts.map