# Minimal Example - Simple Note Manager

This is the most basic example of a generated MCP tool. It demonstrates the core functionality with minimal configuration.

## What's Generated

- **MCP Tools**: Basic CRUD operations for notes
- **Business Logic**: Pure functions for note management
- **Data Access**: PostgreSQL integration with type safety
- **Database**: Migration scripts and schema
- **Deployment**: Docker Compose setup

## Quick Start

1. **Install dependencies**:
   ```bash
   cd generated_tool
   npm install
   ```

2. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start with Docker** (Recommended):
   ```bash
   docker-compose up -d
   docker-compose exec app npm run db:migrate
   ```

4. **Or setup local PostgreSQL**:
   ```bash
   # Ensure PostgreSQL is running locally
   npm run db:migrate
   npm run build
   npm start
   ```

## Testing the Tool

Once running, the tool provides these MCP functions:

- `createCustomer`: Create a new customer record
- `getCustomer`: Retrieve customer by ID
- `listCustomers`: List all customers
- `updateCustomer`: Update customer information
- `deleteCustomer`: Remove customer record

## File Structure

```
generated_tool/
├── schemas/           # Zod schemas (single source of truth)
│   └── customer.ts
├── mcp-tools/         # MCP tool implementations
│   └── createCustomer.ts
├── business-logic/    # Pure business functions
│   └── createCustomer.ts
├── dao/              # Database access layer
│   └── CustomerDAO.ts
├── migrations/       # Database migrations
├── scripts/          # Utility scripts
├── package.json      # Dependencies and scripts
├── docker-compose.yml # Container setup
└── .env.example      # Environment template
```

## Architecture

The generated tool follows a clean architecture pattern:

1. **MCP Layer** → Handles Claude integration
2. **Business Logic** → Pure functions, easy to test
3. **Data Access** → Type-safe database operations
4. **Database** → PostgreSQL with migrations

## Customization

You can modify the generated code:

- **Add fields**: Edit `schemas/customer.ts`
- **Add validation**: Update Zod schemas
- **Add operations**: Create new MCP tools
- **Change database**: Modify DAO implementations

## Common Issues

### Database Connection
```bash
# Check if PostgreSQL is running
docker-compose ps
```

### Port Conflicts
```bash
# Change ports in docker-compose.yml if needed
# Default: PostgreSQL on 5432
```

### Permission Issues
```bash
# Ensure proper file permissions
chmod +x scripts/*.js
```

## Next Steps

1. Try generating with UI: `npm run generate:ui "Note manager" --with-ui`
2. Explore other presets: `--preset crm`, `--preset ecommerce`
3. Check out the full documentation in `../../docs/`

This minimal example demonstrates the power of MCP Tool Builder - from a simple natural language description to a fully functional, type-safe, production-ready tool in seconds.