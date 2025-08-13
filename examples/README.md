# Examples

Ready-to-run examples demonstrating MCP Tool Builder capabilities.

## 🚀 Quick Start - Minimal Example

The fastest way to understand MCP Tool Builder:

```bash
cd minimal/simple-note-tool
npm install
npm run build
npm start
```

**What you get**: A fully functional MCP tool with CRUD operations, input validation, and error handling in just ~250 lines of code.

## 📁 Available Examples

### [`minimal/`](./minimal/)
- **simple-note-tool/**: The simplest possible working MCP tool
- **generated_tool/**: Output from basic generation command
- Shows core MCP concepts without complexity

### Coming Soon
- **basic-crud/**: Customer management with database
- **e-commerce/**: Full online store with payment integration
- **crm/**: Sales pipeline with workflow management  
- **support/**: Ticketing system with role-based access
- **analytics/**: Business intelligence dashboard

## 🎯 Learning Path

1. **Start here**: [`minimal/simple-note-tool`](./minimal/simple-note-tool/) - Understand MCP basics
2. **Generate your own**: `npm run generate:ui "Your idea here"`
3. **Add complexity**: Try presets like `--preset crm --with-ui`
4. **Explore advanced**: Check generated examples in `../generated/`

## 🛠 Generate New Examples

```bash
# Basic CRUD system
npm run generate:ui "Customer management system"

# E-commerce with UI
npm run generate:ui "Online store" --preset ecommerce --with-ui

# CRM with analytics
npm run generate:ui "Sales CRM" --preset crm --with-ui --enable-analytics

# Support system with workflow
npm run generate:ui "Support ticketing" --preset support --with-ui
```

All generated examples include:
- ✅ Full TypeScript implementation
- ✅ Docker deployment setup
- ✅ Database migrations
- ✅ Input validation
- ✅ Error handling
- ✅ Documentation

## 📖 What Each Example Teaches

| Example | Concepts | Technologies | Difficulty |
|---------|----------|--------------|------------|
| **simple-note-tool** | MCP Protocol, Tool Registration, Input Validation | MCP SDK, Zod, TypeScript | ⭐ Beginner |
| **generated_tool** | Code Generation, Architecture Patterns | Same + PostgreSQL, Docker | ⭐⭐ Intermediate |
| **crm** (generated) | Business Logic, UI Generation, Security | Same + React, RBAC, Analytics | ⭐⭐⭐ Advanced |

## 🔧 Customization

Each example can be customized:

1. **Modify schemas**: Edit Zod schemas for different data structures
2. **Add tools**: Create new MCP tool functions
3. **Change storage**: Switch from memory to database
4. **Add UI**: Generate web interfaces with `--with-ui`

## 🎓 Best Practices Demonstrated

- **Type Safety**: Full TypeScript coverage
- **Input Validation**: Runtime validation with Zod
- **Error Handling**: Proper error responses
- **Clean Architecture**: Separation of concerns
- **Documentation**: Self-documenting code
- **Testing**: Test structure (where applicable)

Ready to build your first MCP tool? Start with the minimal example!