/**
 * UI Tool Allowlist Configuration
 * 
 * Defines which MCP tools can be invoked from UI components
 * Generated automatically for generated_tool
 */

export const allowedTools = [
  "createItem",
  "getItem",
  "updateItem",
  "deleteItem",
  "listItems"
] as const;

// Type for compile-time checking
export type AllowedTool = typeof allowedTools[number];

// Validation function
export function isAllowedTool(tool: string): tool is AllowedTool {
  return allowedTools.includes(tool as AllowedTool);
}

// Export for runtime validation
export { allowedTools as default };