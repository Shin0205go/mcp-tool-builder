# generated_tool

Generated tool from prompt: generate

## Features

- **Schema-first Design**: Single source of truth with Zod schemas
- **Type Safety**: Full TypeScript support with automatic type generation
- **MCP Integration**: Native Model Context Protocol support
- **UI Components**: Automatically generated web forms and views
- **Safe Communication**: Origin-verified postMessage with idempotency
- **Database Ready**: PostgreSQL with migrations and seeding
- **Docker Support**: Production-ready containerization

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. Run database migrations:
   ```bash
   npm run db:migrate
   ```

4. Build and start:
   ```bash
   npm run build
   npm start
   ```

## Architecture

```
UI Components (HTML/JS)
       ↓
MCP Tools (API Layer)
       ↓
Business Logic (Pure Functions)
       ↓
DAO Layer (Direct SQL)
       ↓
PostgreSQL Database
```

## Available Tools

- **createItem**: Create a new item
- **getItem**: Get a item by ID
- **updateItem**: Update a item
- **deleteItem**: Delete a item
- **listItems**: List all items

## Entities

- **Item**: id, createdAt, updatedAt, name, description


## UI Components

Each entity automatically generates:

- **Create Form**: Add new records
- **Edit Form**: Modify existing records  
- **List View**: Browse and filter records
- **Detail View**: View complete record details
- **Search**: Full-text search across fields

Access UI components via MCP resources:
```
ui://entityname/create-form
ui://entityname/list-view
```


## Development

- **Build**: `npm run build`
- **Watch**: `npm run dev` 
- **Test**: `npm test`
- **Migrate**: `npm run db:migrate`

## Docker Deployment

```bash
docker-compose up -d
docker-compose exec app npm run db:migrate
```

Generated with [MCP Tool Builder](https://github.com/your-org/mcp-tool-builder) 🚀
