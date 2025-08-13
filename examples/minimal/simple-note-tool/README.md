# Simple Note Tool - Minimal MCP Example

The simplest possible MCP tool that actually works. This example demonstrates basic MCP functionality with a minimal codebase.

## Features

- ✅ Create notes with title and content
- ✅ Get individual notes by ID  
- ✅ List all notes
- ✅ Update existing notes
- ✅ Delete notes
- ✅ Input validation with Zod
- ✅ Error handling
- ✅ Type safety

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the tool**:
   ```bash
   npm run build
   ```

3. **Test the tool**:
   ```bash
   # Start the server
   npm start
   
   # Or in development mode
   npm run dev
   ```

## How it Works

This is a complete MCP (Model Context Protocol) tool that:

1. **Exposes 5 tools** via the MCP protocol
2. **Validates input** using Zod schemas
3. **Stores data** in memory (no database needed)
4. **Returns JSON responses** that Claude can understand
5. **Handles errors** gracefully

## Code Structure

```
simple-note-tool/
├── src/
│   └── index.ts          # Complete MCP tool implementation
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Usage with Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "simple-note-tool": {
      "command": "node",
      "args": ["/path/to/simple-note-tool/dist/index.js"]
    }
  }
}
```

## Available Tools

### `create_note`
Create a new note with title and content.
```json
{
  "title": "My First Note",
  "content": "This is the content of my note"
}
```

### `get_note`
Retrieve a specific note by ID.
```json
{
  "id": "1"
}
```

### `list_notes`
List all notes (no parameters needed).

### `update_note`
Update an existing note.
```json
{
  "id": "1",
  "title": "Updated Title",
  "content": "Updated content"
}
```

### `delete_note`
Delete a note by ID.
```json
{
  "id": "1"
}
```

## Key Concepts

This minimal example demonstrates:

- **MCP Protocol**: How to implement the Model Context Protocol
- **Tool Registration**: Declaring tools that Claude can use
- **Input Validation**: Using Zod for runtime type checking
- **Error Handling**: Proper error responses
- **Type Safety**: Full TypeScript support

## Next Steps

Once you understand this minimal example:

1. Try the full generator: `npm run generate:ui "Your idea here"`
2. Explore database integration examples
3. Check out the UI generation features
4. Read the full documentation

This example shows that MCP tools can be simple yet powerful!