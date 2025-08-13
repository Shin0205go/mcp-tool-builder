# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

- **Build project**: `npm run build` - Compiles TypeScript to JavaScript and browser bundles
- **Generate MCP tool**: `npm run generate:ui "Your tool description"` - Generate basic MCP tool
- **Generate with UI**: `npm run generate:ui "Your tool description" --with-ui --ui-origin http://localhost:3000` - Generate tool with UI components
- **Run tests**: `npm test` - Run test suite and build validation
- **Development mode**: `npm run dev` - Watch mode for TypeScript compilation
- **Lint code**: `npm run lint` - ESLint validation
- **Format code**: `npm run format` - Prettier code formatting

## Architecture Overview

This is a **Universal MCP Tool Builder** that generates production-ready MCP (Model Context Protocol) tools from natural language descriptions using a capability-driven, template-pack architecture.

### Core Architecture Layers

1. **Schema-First Generation**: Single source of truth with Zod schemas that auto-generate TypeScript types, JSON schemas, and UI forms
2. **Template Pack System**: Pluggable generators for different domains (CRUD, E-commerce, CRM, etc.)
3. **Capability Registry**: Provider abstraction for PostgreSQL, Redis, OAuth, payment systems
4. **UI Auto-Generation**: Secure web interfaces with origin verification and postMessage communication
5. **Production Features**: Docker deployment, migrations, monitoring, audit logging

### Key Components

- `src/index_schema_first.ts` - Main CLI entry point with generation commands
- `src/schema_first/integrated_tool_generator.ts` - Core tool generation engine
- `src/schema_first/llm_based.ts` - LLM-powered specification generation
- `src/core/template_packs/` - Template pack implementations
- `src/templates/` - EJS templates for code generation
- `generated/` and `generated_project/` - Output directories for generated tools

### Generation Approaches

1. **Schema-First** (`generate`): LLM generates specification → Fixed templates → Complete tool
2. **LLM-in-the-Loop** (`generate-v2`): Iterative LLM refinement with TypeScript validation

## Essential Development Patterns

### Generated Tool Structure
```
generated_project/tool_name/
├── schemas/           # Zod schemas (single source of truth)
├── mcp-tools/         # MCP tool definitions
├── business-logic/    # Pure business functions
├── dao/               # Database access layer
├── integration/       # UI-Tool broker (if --with-ui)
├── migrations/        # Database migrations
└── package.json       # Generated dependencies
```

### UI Security Model
When using `--with-ui` flag, generated tools include:
- **Origin Verification**: All postMessage communication verified against `UI_ORIGIN`
- **Tool Allowlist**: Only specified tools can be invoked from UI
- **Idempotency**: Request deduplication via requestId
- **Sandbox**: iframe with restricted permissions

### Template Pack Development
Template packs extend `BaseTemplatePack` and implement:
- `supports(features)` - Feature compatibility check
- `renderTool(action, context)` - Tool code generation
- `renderSchema(entity)` - Schema generation

## Testing and Quality

- All generated tools include comprehensive test suites
- TypeScript strict mode enforced
- SQL injection prevention with parameterized queries
- Input validation via Zod at all boundaries
- Generated code follows consistent patterns

## Configuration

- `builder.config.yaml` - Main configuration file for presets and providers
- `.env` files in generated projects for database URLs and UI origins
- Template customization through EJS templates in `src/templates/`

## Production Deployment

Generated tools include:
- Docker and docker-compose files
- Database migration scripts
- Environment configuration examples
- Health checks and monitoring setup

The system prioritizes security, type safety, and production readiness over development speed.