import { z } from "zod";
export declare const Customer: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    email?: string | undefined;
}, {
    name: string;
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    email?: string | undefined;
}>;
export declare const CreateCustomerInput: z.ZodObject<Pick<{
    id: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "name" | "email">, "strip", z.ZodTypeAny, {
    name: string;
    email?: string | undefined;
}, {
    name: string;
    email?: string | undefined;
}>;
export declare const CreateCustomerOutput: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    email?: string | undefined;
}, {
    name: string;
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    email?: string | undefined;
}>;
export declare const UpdateCustomerInput: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodOptional<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    email?: string | undefined;
}, {
    name?: string | undefined;
    email?: string | undefined;
}>;
export declare const UpdateCustomerOutput: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    email?: string | undefined;
}, {
    name: string;
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    email?: string | undefined;
}>;
export declare const ListCustomerInput: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodString>;
    order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy: string;
    order: "asc" | "desc";
    name?: string | undefined;
}, {
    name?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    order?: "asc" | "desc" | undefined;
}>;
export declare const ListCustomerOutput: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        email?: string | undefined;
    }, {
        name: string;
        id?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        email?: string | undefined;
    }>, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    limit: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    items: {
        name: string;
        id?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        email?: string | undefined;
    }[];
    total: number;
}, {
    page: number;
    limit: number;
    items: {
        name: string;
        id?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        email?: string | undefined;
    }[];
    total: number;
}>;
export declare const SearchCustomerInput: z.ZodObject<{
    query: z.ZodString;
    fields: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    query: string;
    fields: string[];
    name?: string | undefined;
}, {
    query: string;
    name?: string | undefined;
    fields?: string[] | undefined;
}>;
export declare const SearchCustomerOutput: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        email: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        email?: string | undefined;
    }, {
        name: string;
        id?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        email?: string | undefined;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    items: {
        name: string;
        id?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        email?: string | undefined;
    }[];
    total: number;
}, {
    items: {
        name: string;
        id?: string | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        email?: string | undefined;
    }[];
    total: number;
}>;
export type CustomerType = z.infer<typeof Customer>;
export type CreateCustomerInputType = z.infer<typeof CreateCustomerInput>;
export type CreateCustomerOutputType = z.infer<typeof CreateCustomerOutput>;
export type UpdateCustomerInputType = z.infer<typeof UpdateCustomerInput>;
export type UpdateCustomerOutputType = z.infer<typeof UpdateCustomerOutput>;
export type ListCustomerInputType = z.infer<typeof ListCustomerInput>;
export type ListCustomerOutputType = z.infer<typeof ListCustomerOutput>;
export type SearchCustomerInputType = z.infer<typeof SearchCustomerInput>;
export type SearchCustomerOutputType = z.infer<typeof SearchCustomerOutput>;
//# sourceMappingURL=customer.d.ts.map