import { z } from "zod";

// Base Item schema (single source of truth)
export const Item = z.object({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  name: z.string(),
  description: z.string().optional().optional()
});

// Input/Output schemas for operations
export const CreateItemInput = Item.pick({ id: true, createdAt: true, updatedAt: true, name: true, description: true });
export const CreateItemOutput = Item;

export const UpdateItemInput = Item.pick({ id: true, createdAt: true, updatedAt: true, name: true, description: true }).partial();
export const UpdateItemOutput = Item;

export const ListItemInput = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  id: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  name: z.string().optional(),
  description: z.string().optional()
});
export const ListItemOutput = z.object({
  items: z.array(Item),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const SearchItemInput = z.object({
  query: z.string().min(2),
  fields: z.array(z.string()).default(['id', 'name', 'description']),
  id: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  name: z.string().optional(),
  description: z.string().optional()
});
export const SearchItemOutput = z.object({
  items: z.array(Item),
  total: z.number(),
});

// Common delete result schema
export const DeleteResult = z.object({
  success: z.boolean(),
});

// Type exports for TypeScript
export type ItemType = z.infer<typeof Item>;
export type CreateItemInputType = z.infer<typeof CreateItemInput>;
export type CreateItemOutputType = z.infer<typeof CreateItemOutput>;
export type UpdateItemInputType = z.infer<typeof UpdateItemInput>;
export type UpdateItemOutputType = z.infer<typeof UpdateItemOutput>;
export type ListItemInputType = z.infer<typeof ListItemInput>;
export type ListItemOutputType = z.infer<typeof ListItemOutput>;
export type SearchItemInputType = z.infer<typeof SearchItemInput>;
export type SearchItemOutputType = z.infer<typeof SearchItemOutput>;
export type DeleteResultType = z.infer<typeof DeleteResult>;
