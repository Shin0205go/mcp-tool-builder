import { CustomerDAO } from '../dao/CustomerDAO.js';
import { CreateCustomerInput, CreateCustomerOutput } from '../schemas/customer.js';
/**
 * Create a new customer
 */
export const createCustomer = {
    name: 'createCustomer',
    description: 'Create a new customer',
    inputSchema: CreateCustomerInput,
    outputSchema: CreateCustomerOutput,
    async run(input, ctx) {
        const dao = new CustomerDAO();
        try {
            // Validate input
            const validated = CreateCustomerInput.parse(input);
            // Execute operation
            const result = await dao.create(validated);
            return result;
        }
        catch (error) {
            if (error.name === 'ZodError') {
                throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
            }
            throw error;
        }
    }
};
//# sourceMappingURL=createCustomer.js.map