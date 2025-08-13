/**
 * UI Tool Allowlist Configuration
 * 
 * Defines which MCP tools can be invoked from UI components
 * Generated automatically based on preset and UI requirements
 */

// CRM Preset - Customer Management Tools
export const allowedTools = [
  // Customer operations
  "listCustomers",
  "searchCustomers", 
  "getCustomer",
  "createCustomer",
  "updateCustomer",
  "deleteCustomer",
  
  // Order operations  
  "listOrders",
  "listRecentOrders",
  "getOrder",
  "createOrder",
  "updateOrder",
  
  // Contact operations
  "listContacts",
  "searchContacts",
  "createContact",
  "updateContact",
  
  // Dashboard operations
  "getCustomerStats",
  "getRevenueStats",
  "getOrderStats",
  "getDashboardMetrics",
  
  // Search and analytics
  "searchAll",
  "getActivityFeed",
  "getRecentActivity"
] as const;

// Type for compile-time checking
export type AllowedTool = typeof allowedTools[number];

// Validation function
export function isAllowedTool(tool: string): tool is AllowedTool {
  return allowedTools.includes(tool as AllowedTool);
}

// Get tools by category for UI organization
export const toolCategories = {
  customers: [
    "listCustomers",
    "searchCustomers", 
    "getCustomer",
    "createCustomer",
    "updateCustomer",
    "deleteCustomer"
  ],
  orders: [
    "listOrders",
    "listRecentOrders", 
    "getOrder",
    "createOrder",
    "updateOrder"
  ],
  contacts: [
    "listContacts",
    "searchContacts",
    "createContact", 
    "updateContact"
  ],
  dashboard: [
    "getCustomerStats",
    "getRevenueStats", 
    "getOrderStats",
    "getDashboardMetrics",
    "getActivityFeed",
    "getRecentActivity"
  ]
} as const;

// Export for runtime validation
export { allowedTools as default };