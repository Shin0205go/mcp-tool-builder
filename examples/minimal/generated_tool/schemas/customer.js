import { z } from "zod";
// Base Customer schema (single source of truth)
export const Customer = z.object({
    id: z.string().uuid().optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    name: z.string(),
    email: z.string().optional().optional()
});
// Input/Output schemas for operations
export const CreateCustomerInput = Customer.pick({ name: true, email: true });
export const CreateCustomerOutput = Customer;
export const UpdateCustomerInput = Customer.pick({ name: true, email: true }).partial();
export const UpdateCustomerOutput = Customer;
export const ListCustomerInput = z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    sortBy: z.string().default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
    name: z.string().optional()
});
export const ListCustomerOutput = z.object({
    items: z.array(Customer),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
});
export const SearchCustomerInput = z.object({
    query: z.string().min(2),
    fields: z.array(z.string()).default(['name']),
    name: z.string().optional()
});
export const SearchCustomerOutput = z.object({
    items: z.array(Customer),
    total: z.number(),
});
//# sourceMappingURL=customer.js.map