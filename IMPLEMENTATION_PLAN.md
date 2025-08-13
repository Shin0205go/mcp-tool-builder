# MCP Tool Builder v3: Schema-First Implementation Plan

## Core Architecture Changes

### 1. Contract-Driven Generation (contracts/*.schema.json → outputs)
```
contracts/customer.schema.json → 
├── migrations/001_create_customers.sql (PostgreSQL)
├── generated/schemas/customer.ts (Zod schemas)  
├── generated/adapters/customer.ts (Type adapters)
├── generated/mcp-tools/customer-*.ts (MCP tools)
├── generated/resources/dashboard.ts (UI resources)
└── dist/index.js (Entry point)
```

### 2. Fixed ABI Templates (.ejs)
```
src/templates/
├── schema.ts.ejs          # Zod schema generation  
├── adapters.ts.ejs        # Type conversion (DB↔API)
├── tool.ts.ejs           # MCP tool with adapter enforcement
├── resource.ts.ejs       # UI resource with postMessage
├── migration.sql.ejs     # PostgreSQL DDL
└── index.ts.ejs         # Main server with all MCP endpoints
```

### 3. Type System Enforcement
- All API responses go through `toApi*(dbRow)` adapters
- All DB inserts go through `toStorage*(apiData)` adapters  
- Zod schemas define the single source of truth

### 4. Built-in UI Distribution
- `resources/list` returns `ui://project/dashboard` 
- `resources/read` returns HTML with embedded postMessage broker
- UI invokes tools via `mcp:tool.invoke` with allowTools enforcement

## Implementation Steps
1. Create contract schema loader
2. Build EJS template system  
3. Implement type adapters
4. Add MCP endpoint handlers
5. Generate UI resources
6. CLI integration with validation