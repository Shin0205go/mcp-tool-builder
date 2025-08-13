# generated_tool

Generated tool from prompt: Simple note manager

## Features

- **Schema-first Design**: Single source of truth with Zod schemas
- **Type Safety**: Full TypeScript support with automatic type generation
- **MCP Integration**: Native Model Context Protocol support


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
MCP Client
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

- **createCustomer**: Create a new customer

## Entities

- **Customer**: name, email



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
