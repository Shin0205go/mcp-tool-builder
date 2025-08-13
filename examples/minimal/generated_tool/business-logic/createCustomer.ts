import { CustomerDAO } from '../dao/CustomerDAO.js';
import { 
  CreateCustomerInput,
  type CreateCustomerInputType,
  type CreateCustomerOutputType
} from '../schemas/customer.js';

/**
 * Create a new customer - Business Logic
 */
export async function createCustomer(
  input: CreateCustomerInputType,
  context: { userId?: string; idempotencyKey?: string } = {}
): Promise<CreateCustomerOutputType> {
  
  const dao = new CustomerDAO();
  
  // Input validation
  const validated = CreateCustomerInput.parse(input);
  
  // Business rules and logic
  // TODO: Implement business rules
    // Example rules:
    // - Validate business constraints
    // - Check permissions
    // - Apply business logic
    // - Send notifications
  
  // Execute database operation
  const result = await dao.create(validated);
        return result;
}