import { promises as fs } from 'fs';
import { join } from 'path';
import { GeneratedTool, Entity, Operation } from '../types/index.js';
import { SchemaFirstGenerator } from './schema_generator.js';
import { UITemplateEngine, UIGenerationOptions } from './ui_template_engine.js';

export interface IntegratedGenerationOptions extends UIGenerationOptions {
  outputDir: string;
  toolName: string;
  withUI: boolean;
  allowedTools?: string[];
}

/**
 * 統合ツールジェネレーター
 * Schema-first approach で MCP Tool + UI を一括生成
 */
export class IntegratedToolGenerator {
  private schemaGenerator = new SchemaFirstGenerator();
  private uiEngine = new UITemplateEngine();

  /**
   * 完全な統合ツールを生成
   */
  async generateIntegratedTool(
    tool: GeneratedTool,
    options: IntegratedGenerationOptions
  ): Promise<string> {
    const outputDir = options.outputDir;
    
    // ディレクトリ構造を作成
    await this.createDirectoryStructure(outputDir, options.withUI);
    
    // 各エンティティについて処理
    for (const entity of tool.entities) {
      // 1. Zodスキーマを生成
      await this.generateEntitySchema(entity, outputDir);
      
      // 2. MCPツールを生成 
      await this.generateMcpTools(entity, tool.operations, outputDir);
      
      // 3. ビジネスロジックを生成
      await this.generateBusinessLogic(entity, tool.operations, outputDir);
      
      // 4. DAO層を生成
      await this.generateDAO(entity, outputDir);
      
      // 5. UIコンポーネントを生成（オプション）
      if (options.withUI) {
        await this.generateUIComponents(entity, outputDir, options);
      }
    }
    
    // 6. 統合ファイルを生成
    await this.generateMainServer(tool, outputDir, options);
    await this.generateBrokerIntegration(tool, outputDir, options);
    
    // UI統合ファイルを生成
    if (options.withUI) {
      await this.generateUIIntegrationFiles(tool, outputDir, options);
    }
    
    await this.generatePackageJson(tool, outputDir, options);
    await this.generateReadme(tool, outputDir, options);
    
    // 7. 開発・デプロイ用ファイル
    await this.generateDockerFiles(tool, outputDir);
    await this.generateDevelopmentScripts(tool, outputDir);
    
    return outputDir;
  }

  /**
   * ディレクトリ構造を作成
   */
  private async createDirectoryStructure(outputDir: string, withUI: boolean): Promise<void> {
    const dirs = [
      'schemas',
      'business-logic',
      'dao',
      'mcp-tools',
      'migrations',
      'scripts',
      'tests'
    ];
    
    if (withUI) {
      dirs.push('ui-resources', 'integration', 'mcp-ui-server', 'mcp-ui-server/tools', 'host');
    }
    
    for (const dir of dirs) {
      await fs.mkdir(join(outputDir, dir), { recursive: true });
    }
  }

  /**
   * エンティティスキーマを生成
   */
  private async generateEntitySchema(entity: Entity, outputDir: string): Promise<void> {
    const schemaCode = this.schemaGenerator.generateZodSchema(entity);
    const filename = join(outputDir, 'schemas', `${entity.name.toLowerCase()}.ts`);
    await fs.writeFile(filename, schemaCode);
  }

  /**
   * MCPツールを生成
   */
  private async generateMcpTools(
    entity: Entity, 
    operations: Operation[], 
    outputDir: string
  ): Promise<void> {
    const entityOps = operations.filter(op => 
      op.name.toLowerCase().includes(entity.name.toLowerCase())
    );
    
    for (const operation of entityOps) {
      const toolCode = this.generateMcpTool(entity, operation);
      const filename = join(outputDir, 'mcp-tools', `${operation.name}.ts`);
      await fs.writeFile(filename, toolCode);
    }
  }

  /**
   * 個別MCPツールコードを生成
   */
  private generateMcpTool(entity: Entity, operation: Operation): string {
    const entityName = entity.name;
    const operationName = operation.name;
    const schema = this.schemaGenerator.generateMcpToolSchema(entity, this.getOperationType(operationName));
    
    return `import { ${entityName}DAO } from '../dao/${entityName}DAO.js';
import { 
  ${this.getInputSchemaImport(operationName, entityName)},
  ${this.getOutputSchemaImport(operationName, entityName)}
} from '../schemas/${entity.name.toLowerCase()}.js';
import type { McpTool } from '../types/mcp.js';

/**
 * ${operation.description || operationName}
 */
export const ${operationName}: McpTool<
  typeof ${this.getInputSchemaName(operationName, entityName)}, 
  typeof ${this.getOutputSchemaName(operationName, entityName)}
> = {
  name: '${operationName}',
  description: '${operation.description || `${operationName} for ${entityName}`}',
  inputSchema: ${this.getInputSchemaName(operationName, entityName)},
  outputSchema: ${this.getOutputSchemaName(operationName, entityName)},
  
  async run(input, ctx) {
    const dao = new ${entityName}DAO();
    
    try {
      // Validate input
      const validated = ${this.getInputSchemaName(operationName, entityName)}.parse(input);
      
      // Execute operation
      ${this.generateToolLogic(operationName, entityName)}
      
    } catch (error: any) {
      if (error.name === 'ZodError') {
        throw new Error(\`Validation failed: \${error.errors.map(e => e.message).join(', ')}\`);
      }
      throw error;
    }
  }
};`;
  }

  /**
   * ビジネスロジックを生成
   */
  private async generateBusinessLogic(
    entity: Entity, 
    operations: Operation[], 
    outputDir: string
  ): Promise<void> {
    const entityOps = operations.filter(op => 
      op.name.toLowerCase().includes(entity.name.toLowerCase())
    );
    
    for (const operation of entityOps) {
      const logicCode = this.generateBusinessLogicCode(entity, operation);
      const filename = join(outputDir, 'business-logic', `${operation.name}.ts`);
      await fs.writeFile(filename, logicCode);
    }
  }

  /**
   * ビジネスロジックコードを生成
   */
  private generateBusinessLogicCode(entity: Entity, operation: Operation): string {
    const entityName = entity.name;
    const operationName = operation.name;
    
    return `import { ${entityName}DAO } from '../dao/${entityName}DAO.js';
import { 
  ${this.getInputSchemaImport(operationName, entityName)},
  type ${this.getInputTypeName(operationName, entityName)},
  type ${this.getOutputTypeName(operationName, entityName)}
} from '../schemas/${entity.name.toLowerCase()}.js';

/**
 * ${operation.description || operationName} - Business Logic
 */
export async function ${operationName}(
  input: ${this.getInputTypeName(operationName, entityName)},
  context: { userId?: string; idempotencyKey?: string } = {}
): Promise<${this.getOutputTypeName(operationName, entityName)}> {
  
  const dao = new ${entityName}DAO();
  
  // Input validation
  const validated = ${this.getInputSchemaName(operationName, entityName)}.parse(input);
  
  // Business rules and logic
  ${this.generateBusinessRules(entity, operationName)}
  
  // Execute database operation
  ${this.generateDatabaseOperation(operationName, entityName)}
}`;
  }

  /**
   * DAO層を生成
   */
  private async generateDAO(entity: Entity, outputDir: string): Promise<void> {
    const daoCode = this.generateDAOCode(entity);
    const filename = join(outputDir, 'dao', `${entity.name}DAO.ts`);
    await fs.writeFile(filename, daoCode);
  }

  /**
   * DAOコードを生成
   */
  private generateDAOCode(entity: Entity): string {
    const entityName = entity.name;
    const tableName = entity.name.toLowerCase();
    
    return `import { Pool } from 'pg';
import { 
  ${entityName},
  Create${entityName}Input,
  Update${entityName}Input,
  type ${entityName}Type
} from '../schemas/${entity.name.toLowerCase()}.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * ${entityName} Data Access Object
 * Direct SQL queries for ${entityName} operations
 */
export class ${entityName}DAO {
  
  /**
   * Create a new ${entity.name}
   */
  async create(data: typeof Create${entityName}Input._type): Promise<${entityName}Type> {
    const validated = Create${entityName}Input.parse(data);
    const fields = Object.keys(validated);
    const values = Object.values(validated);
    const placeholders = fields.map((_, i) => \`$\${i + 1}\`).join(', ');
    
    const query = \`
      INSERT INTO "${tableName}" (\${fields.join(', ')})
      VALUES (\${placeholders})
      RETURNING *
    \`;
    
    const result = await pool.query(query, values);
    return ${entityName}.parse(result.rows[0]);
  }
  
  /**
   * Find ${entity.name} by ID
   */
  async findById(id: string): Promise<${entityName}Type | null> {
    const query = 'SELECT * FROM "${tableName}" WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return ${entityName}.parse(result.rows[0]);
  }
  
  /**
   * Find all ${entity.name}s with filters
   */
  async findAll(filters: Record<string, any> = {}): Promise<${entityName}Type[]> {
    let query = 'SELECT * FROM "${tableName}" WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        paramCount++;
        query += \` AND \${key} = $\${paramCount}\`;
        values.push(value);
      }
    });
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, values);
    return result.rows.map(row => ${entityName}.parse(row));
  }
  
  /**
   * Update ${entity.name}
   */
  async update(id: string, data: typeof Update${entityName}Input._type): Promise<${entityName}Type | null> {
    const validated = Update${entityName}Input.parse(data);
    const fields = Object.keys(validated);
    const values = Object.values(validated);
    
    if (fields.length === 0) {
      return this.findById(id);
    }
    
    const setClause = fields.map((f, i) => \`\${f} = $\${i + 2}\`).join(', ');
    
    const query = \`
      UPDATE "${tableName}"
      SET \${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    \`;
    
    const result = await pool.query(query, [id, ...values]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return ${entityName}.parse(result.rows[0]);
  }
  
  /**
   * Delete ${entity.name}
   */
  async delete(id: string): Promise<${entityName}Type | null> {
    const query = 'DELETE FROM "${tableName}" WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return ${entityName}.parse(result.rows[0]);
  }
  
  /**
   * Get statistics for ${entity.name}
   */
  async getStats(): Promise<Record<string, any>> {
    const countQuery = 'SELECT COUNT(*) as total FROM "${tableName}"';
    const countResult = await pool.query(countQuery);
    
    const stats: Record<string, any> = {
      total: parseInt(countResult.rows[0].total)
    };
    
    // Add numeric field averages
${entity.fields.filter(f => f.type === 'number').map(field => 
  `    const avg${field.name}Query = 'SELECT AVG(${field.name}) as avg_${field.name} FROM "${tableName}" WHERE ${field.name} IS NOT NULL';
    const avg${field.name}Result = await pool.query(avg${field.name}Query);
    stats.avg${field.name} = parseFloat(avg${field.name}Result.rows[0].avg_${field.name}) || 0;`
).join('\n')}
    
    return stats;
  }
}`;
  }

  /**
   * UIコンポーネントを生成
   */
  private async generateUIComponents(
    entity: Entity, 
    outputDir: string, 
    options: IntegratedGenerationOptions
  ): Promise<void> {
    const components = this.uiEngine.generateAllUIComponents(entity, options);
    
    for (const component of components) {
      const filename = join(outputDir, 'ui-resources', `${component.name}.html`);
      await fs.writeFile(filename, component.htmlTemplate);
    }
  }

  /**
   * メインサーバーを生成
   */
  private async generateMainServer(
    tool: GeneratedTool, 
    outputDir: string, 
    options: IntegratedGenerationOptions
  ): Promise<void> {
    const serverCode = `#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import MCP tools
${tool.operations.map(op => 
  `import { ${op.name} } from './mcp-tools/${op.name}.js';`
).join('\n')}

// Create MCP server
const server = new Server(
  {
    name: '${tool.name}',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},${options.withUI ? '\n      resources: {},' : ''}
    },
  }
);

// Register tools
const tools = [
${tool.operations.map(op => `  ${op.name}`).join(',\n')}
];

server.setRequestHandler('tools/list', async () => ({
  tools: tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }))
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  const tool = tools.find(t => t.name === name);
  if (!tool) {
    throw new Error(\`Unknown tool: \${name}\`);
  }
  
  try {
    const result = await tool.run(args || {}, {});
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (error: any) {
    console.error(\`Error in \${name}:\`, error);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message
        }, null, 2),
      }],
      isError: true,
    };
  }
});

${options.withUI ? this.generateUIResourceHandlers(tool) : ''}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('${tool.name} MCP Server running');
}

main().catch(console.error);
`;

    await fs.writeFile(join(outputDir, 'index.ts'), serverCode);
  }

  /**
   * UIリソースハンドラーを生成
   */
  private generateUIResourceHandlers(tool: GeneratedTool): string {
    return `
// Register UI resources
server.setRequestHandler('resources/list', async () => {
  const resources = [];
  
${tool.entities.map(entity => {
  const entityLower = entity.name.toLowerCase();
  return `  // ${entity.name} UI resources
  resources.push(
    { uri: 'ui://${entityLower}/create-form', name: 'Create ${entity.name} Form', mimeType: 'text/html' },
    { uri: 'ui://${entityLower}/edit-form', name: 'Edit ${entity.name} Form', mimeType: 'text/html' },
    { uri: 'ui://${entityLower}/list-view', name: '${entity.name} List View', mimeType: 'text/html' },
    { uri: 'ui://${entityLower}/detail-view', name: '${entity.name} Detail View', mimeType: 'text/html' }
  );`;
}).join('\n')}
  
  return { resources };
});

server.setRequestHandler('resources/read', async (request) => {
  const { uri } = request.params;
  
  // Map URI to file path
  const uriToFile = {
${tool.entities.map(entity => {
  const entityLower = entity.name.toLowerCase();
  return `    'ui://${entityLower}/create-form': 'ui-resources/${entityLower}-create-form.html',
    'ui://${entityLower}/edit-form': 'ui-resources/${entityLower}-edit-form.html',
    'ui://${entityLower}/list-view': 'ui-resources/${entityLower}-list-view.html',
    'ui://${entityLower}/detail-view': 'ui-resources/${entityLower}-detail-view.html'`;
}).join(',\n')}
  };
  
  const filePath = uriToFile[uri];
  if (!filePath) {
    throw new Error(\`Resource not found: \${uri}\`);
  }
  
  const fs = await import('fs/promises');
  const path = await import('path');
  const content = await fs.readFile(path.join(process.cwd(), filePath), 'utf-8');
  
  return {
    contents: [{
      type: 'text',
      text: content,
      mimeType: 'text/html'
    }]
  };
});`;
  }

  /**
   * Broker統合を生成
   */
  private async generateBrokerIntegration(
    tool: GeneratedTool, 
    outputDir: string, 
    options: IntegratedGenerationOptions
  ): Promise<void> {
    if (!options.withUI) return;
    
    const brokerCode = `import { createUIToolBroker, type McpToolExecutor } from './ui-tool-broker.js';
${tool.operations.map(op => `import { ${op.name} } from './mcp-tools/${op.name}.js';`).join('\n')}

// Tool executor implementation
const toolExecutor: McpToolExecutor = async (toolName, params, context) => {
  const toolMap: Record<string, any> = {
${tool.operations.map(op => `    '${op.name}': ${op.name}`).join(',\n')}
  };
  
  const tool = toolMap[toolName];
  if (!tool) {
    throw new Error(\`Unknown tool: \${toolName}\`);
  }
  
  return await tool.run(params, context);
};

// Create and configure broker
export const uiBroker = createUIToolBroker(toolExecutor, {
  allowedOrigin: '${options.origin}',
  allowedTools: [${options.allowedTools?.map(t => `'${t}'`).join(', ') || tool.operations.map(op => `'${op.name}'`).join(', ')}],
  enableIdempotency: true,
  maxConcurrentJobs: 5,
  requestTimeoutMs: 30000
});

// Usage example:
// const iframe = document.querySelector('iframe');
// uiBroker.attachToIframe(iframe);
`;

    await fs.writeFile(join(outputDir, 'integration', 'ui-broker-setup.ts'), brokerCode);
  }

  /**
   * UI統合ファイルを生成
   */
  private async generateUIIntegrationFiles(
    tool: GeneratedTool,
    outputDir: string,
    options: IntegratedGenerationOptions
  ): Promise<void> {
    // テンプレートからUI統合ファイルをコピー
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFile);
    const templateDir = join(currentDir, '../templates');
    
    // 1. integration/ui-tool-broker.ts
    const brokerCode = this.generateUIToolBroker();
    await fs.writeFile(join(outputDir, 'integration/ui-tool-broker.ts'), brokerCode);
    
    // 2. integration/allowlist.ts (カスタマイズ版)
    const allowlistCode = this.generateAllowlist(tool, options);
    await fs.writeFile(join(outputDir, 'integration/allowlist.ts'), allowlistCode);
    
    // 3. mcp-ui-server/server.ts
    const uiServerCode = this.generateMCPUIServer();
    await fs.writeFile(join(outputDir, 'mcp-ui-server/server.ts'), uiServerCode);
    
    // 4. mcp-ui-server/tools/ui.customer.dashboard.ts (プリセット依存)
    const dashboardTool = this.generateDashboardTool(tool, options);
    await fs.writeFile(join(outputDir, 'mcp-ui-server/tools/ui.customer.dashboard.ts'), dashboardTool);
    
    // 5. host/embed.ts
    const embedCode = this.generateHostEmbed();
    await fs.writeFile(join(outputDir, 'host/embed.ts'), embedCode);
    
    // 6. デモ用のHTMLファイル (開発用)
    const demoHtml = this.generateDemoHTML(tool, options);
    await fs.writeFile(join(outputDir, 'demo.html'), demoHtml);
  }

  /**
   * テンプレートファイルを読み込み
   */
  private async readTemplate(templatePath: string): Promise<string> {
    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      console.warn(`Template not found: ${templatePath}, using fallback`);
      return '// Template not found - please check template path';
    }
  }

  /**
   * プロジェクト固有のallowlistを生成
   */
  private generateAllowlist(tool: GeneratedTool, options: IntegratedGenerationOptions): string {
    const allowedTools = options.allowedTools || tool.operations.map(op => op.name);
    
    return `/**
 * UI Tool Allowlist Configuration
 * 
 * Defines which MCP tools can be invoked from UI components
 * Generated automatically for ${tool.name}
 */

export const allowedTools = [
${allowedTools.map(tool => `  "${tool}"`).join(',\n')}
] as const;

// Type for compile-time checking
export type AllowedTool = typeof allowedTools[number];

// Validation function
export function isAllowedTool(tool: string): tool is AllowedTool {
  return allowedTools.includes(tool as AllowedTool);
}

// Export for runtime validation
export { allowedTools as default };`;
  }

  /**
   * ダッシュボードツールを生成 (プリセット対応)
   */
  private generateDashboardTool(tool: GeneratedTool, options: IntegratedGenerationOptions): string {
    const entityName = tool.entities[0]?.name || 'Item';
    const entityLower = entityName.toLowerCase();
    const toolName = tool.name.replace(/_/g, '-');
    
    return `/**
 * ${entityName} Dashboard UI Tool
 * 
 * Returns UI specification with HTML content, bootstrap needs, and allowed tools
 * Generated for ${tool.name}
 */

import { allowedTools } from '../../integration/allowlist.js';

interface UIToolParams {
  limit?: number;
  preset?: string;
}

interface UIToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

export async function ui${entityName}Dashboard(params: UIToolParams): Promise<UIToolResult> {
  const { limit = 20 } = params;

  // UI specification with needs and allowTools
  const uiSpec = {
    uri: "ui://${entityLower}/dashboard",
    content: {
      type: "rawHtml",
      htmlString: generateDashboardHTML(limit, '${entityName}', '${toolName}')
    },
    needs: [
      { tool: "list${entityName}s", params: { limit } }${tool.operations.some(op => op.name.includes('Stats')) ? `,
      { tool: "get${entityName}Stats", params: {} }` : ''}${tool.operations.some(op => op.name.includes('Recent')) ? `,
      { tool: "listRecent${entityName}s", params: { days: 7, limit: 10 } }` : ''}
    ],
    allowTools: allowedTools
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(uiSpec, null, 2)
      }
    ]
  };
}

function generateDashboardHTML(limit: number, entityName: string, toolName: string): string {
  const entityLower = entityName.toLowerCase();
  const entityPlural = entityName.endsWith('s') ? entityName : entityName + 's';
  const entityPluralLower = entityPlural.toLowerCase();
  
  return \`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\${entityName} Management Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        
        .header h1 {
            color: #0f172a;
            font-size: 24px;
            font-weight: 600;
        }
        
        .search-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        
        .search-form {
            display: flex;
            gap: 12px;
            align-items: end;
        }
        
        .form-group {
            flex: 1;
        }
        
        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 4px;
        }
        
        .form-group input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
        }
        
        .btn-secondary {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
        }
        
        .btn-secondary:hover {
            background: #e2e8f0;
        }
        
        .results-section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .results-header {
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .results-header h2 {
            font-size: 18px;
            font-weight: 600;
        }
        
        .item-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
            padding: 20px;
        }
        
        .item-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 16px;
            transition: all 0.2s;
        }
        
        .item-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .item-title {
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 4px;
        }
        
        .item-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #64748b;
        }
        
        .loading {
            padding: 40px;
            text-align: center;
            color: #64748b;
        }
        
        .error {
            padding: 20px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            color: #dc2626;
            margin-bottom: 20px;
        }
        
        .empty-state {
            padding: 40px;
            text-align: center;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>\${entityName} Management Dashboard</h1>
        </div>
        
        <div class="search-section">
            <form id="search-form" class="search-form">
                <div class="form-group">
                    <label for="search-query">Search \${entityPlural}</label>
                    <input type="text" id="search-query" name="query" placeholder="Search...">
                </div>
                <div class="form-group">
                    <label for="search-limit">Limit</label>
                    <input type="number" id="search-limit" name="limit" value="\${limit}" min="1" max="100">
                </div>
                <button type="submit" class="btn btn-primary">Search</button>
                <button type="button" id="reset-btn" class="btn btn-secondary">Reset</button>
            </form>
        </div>
        
        <div class="results-section">
            <div class="results-header">
                <h2>\${entityPlural}</h2>
                <button id="refresh-btn" class="btn btn-secondary">Refresh</button>
            </div>
            <div id="items-container">
                <div class="loading">Loading \${entityPluralLower}...</div>
            </div>
        </div>
    </div>

    <script>
        const ORIGIN = window.location.origin;
        
        // Render items
        function renderItems(items) {
            const container = document.getElementById('items-container');
            
            if (!items || items.length === 0) {
                container.innerHTML = '<div class="empty-state">No \${entityPluralLower} found</div>';
                return;
            }
            
            const grid = document.createElement('div');
            grid.className = 'item-grid';
            
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card';
                card.innerHTML = \\\`
                    <div class="item-title">\\\${item.name || item.title || 'Untitled'}</div>
                    <div class="item-meta">
                        <span>ID: \\\${item.id}</span>
                        <span>\\\${new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                \\\`;
                grid.appendChild(card);
            });
            
            container.innerHTML = '';
            container.appendChild(grid);
        }
        
        function showLoading() {
            document.getElementById('items-container').innerHTML = 
                '<div class="loading">Loading \${entityPluralLower}...</div>';
        }
        
        function showError(error) {
            const container = document.getElementById('items-container');
            container.innerHTML = \\\`
                <div class="error">
                    <strong>Error:</strong> \\\${error.message || 'An unexpected error occurred'}
                </div>
            \\\`;
        }
        
        // MCP Tool Communication
        function invokeTool(tool, params = {}) {
            const requestId = crypto.randomUUID();
            
            console.log(\\\`[Dashboard] Invoking tool: \\\${tool}\\\`, params);
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(\\\`Tool \\\${tool} timed out\\\`));
                }, 30000);
                
                function handleResult(event) {
                    if (event.data.requestId === requestId) {
                        clearTimeout(timeout);
                        window.removeEventListener('message', handleResult);
                        
                        if (event.data.type === 'mcp:tool.result') {
                            resolve(event.data.result);
                        } else if (event.data.type === 'mcp:tool.error') {
                            reject(new Error(event.data.error.message));
                        }
                    }
                }
                
                window.addEventListener('message', handleResult);
                
                window.parent.postMessage({
                    type: 'mcp:tool.invoke',
                    requestId,
                    tool,
                    params
                }, ORIGIN);
            });
        }
        
        // Event Handlers
        async function search\${entityPlural}() {
            const form = document.getElementById('search-form');
            const formData = new FormData(form);
            const query = formData.get('query');
            const limit = parseInt(formData.get('limit')) || 20;
            
            showLoading();
            
            try {
                const params = { limit };
                if (query) {
                    params.query = query;
                }
                
                const result = await invokeTool('search\${entityPlural}', params);
                const items = result.items || result.\\\${entityPluralLower} || result || [];
                renderItems(items);
            } catch (error) {
                showError(error);
            }
        }
        
        async function refreshData() {
            showLoading();
            
            try {
                const result = await invokeTool('list\${entityPlural}', { limit: \\\${limit} });
                const items = result.items || result.\\\${entityPluralLower} || result || [];
                renderItems(items);
            } catch (error) {
                showError(error);
            }
        }
        
        // Initialize Dashboard
        function initializeDashboard(bootstrapData) {
            console.log('[Dashboard] Initializing with bootstrap data:', Object.keys(bootstrapData));
            
            if (bootstrapData['list\\\${entityPlural}']) {
                const data = bootstrapData['list\\\${entityPlural}'];
                const items = data.items || data.\\\${entityPluralLower} || data || [];
                renderItems(items);
            }
        }
        
        // Event Listeners
        document.getElementById('search-form').addEventListener('submit', (e) => {
            e.preventDefault();
            search\${entityPlural}();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            document.getElementById('search-form').reset();
            refreshData();
        });
        
        document.getElementById('refresh-btn').addEventListener('click', refreshData);
        
        // Bootstrap listener
        window.addEventListener('message', (event) => {
            if (event.data.type === 'mcp:bootstrap') {
                initializeDashboard(event.data.data);
            }
        });
        
        console.log('[Dashboard] UI initialized, waiting for bootstrap data...');
    </script>
</body>
</html>\`;
}`;
  }

  /**
   * デモHTML生成
   */
  private generateDemoHTML(tool: GeneratedTool, options: IntegratedGenerationOptions): string {
    const entityName = tool.entities[0]?.name || 'Item';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tool.name} - UI Demo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .demo-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .demo-header {
            background: #3b82f6;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .demo-iframe {
            width: 100%;
            height: 800px;
            border: none;
        }
        .demo-controls {
            padding: 20px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
        }
        .demo-note {
            font-size: 14px;
            color: #6b7280;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="demo-container">
        <div class="demo-header">
            <h1>${tool.name}</h1>
            <p>Host-mediated UI Integration Demo</p>
        </div>
        
        <iframe id="ui-iframe" class="demo-iframe" src="about:blank"></iframe>
        
        <div class="demo-controls">
            <button id="load-dashboard" style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-right: 8px;
            ">Load ${entityName} Dashboard</button>
            
            <button id="refresh-data" style="
                background: #10b981;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            ">Refresh Data</button>
            
            <div class="demo-note">
                <strong>Note:</strong> This is a demo of the host-mediated UI integration. 
                In production, this would be integrated into your chat UI or application host.
                <br><br>
                <strong>Origin:</strong> ${options.origin}
            </div>
        </div>
    </div>

    <script type="module">
        import { embedMCPUI } from './host/embed.js';
        
        // Mock MCP client for demo
        const mockMcpClient = {
            async call(tool, params, options) {
                console.log('Mock MCP call:', tool, params);
                
                // Mock responses for demo
                if (tool === 'ui.${entityName.toLowerCase()}.dashboard') {
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify({
                                uri: 'ui://${entityName.toLowerCase()}/dashboard',
                                content: {
                                    type: 'rawHtml',
                                    htmlString: '<!-- UI will be loaded here -->'
                                },
                                needs: [
                                    { tool: 'list${entityName}s', params: { limit: 20 } }
                                ],
                                allowTools: [${tool.operations.map(op => `'${op.name}'`).join(', ')}]
                            })
                        }]
                    };
                }
                
                if (tool === 'list${entityName}s') {
                    return {
                        items: [
                            { id: '1', name: 'Demo ${entityName} 1', createdAt: new Date().toISOString() },
                            { id: '2', name: 'Demo ${entityName} 2', createdAt: new Date().toISOString() }
                        ]
                    };
                }
                
                return { success: true, message: \`Mock response for \${tool}\` };
            }
        };
        
        // Setup demo
        const container = document.getElementById('ui-iframe');
        
        document.getElementById('load-dashboard').addEventListener('click', async () => {
            try {
                await embedMCPUI({
                    container: container.parentElement,
                    uiOrigin: '${options.origin}',
                    mcpClient: mockMcpClient,
                    uiTool: 'ui.${entityName.toLowerCase()}.dashboard',
                    params: { limit: 20 },
                    onLoaded: () => console.log('UI loaded successfully'),
                    onError: (error) => console.error('UI error:', error)
                });
            } catch (error) {
                console.error('Failed to load UI:', error);
            }
        });
        
        console.log('Demo ready - click "Load ${entityName} Dashboard" to start');
    </script>
</body>
</html>`;
  }

  /**
   * UI Tool Brokerコードを生成
   */
  private generateUIToolBroker(): string {
    return `/**
 * UI-Tool Broker for Host-mediated UI Integration
 * 
 * Provides secure communication between UI components and MCP tools
 * Features: Origin verification, Tool allowlist, Idempotency, Error handling
 */

import { allowedTools } from './allowlist.js';

// Message types for UI-Tool communication
interface McpToolInvokeMessage {
  type: 'mcp:tool.invoke';
  requestId: string;
  tool: string;
  params: Record<string, any>;
}

interface McpToolResultMessage {
  type: 'mcp:tool.result';
  requestId: string;
  result: any;
}

interface McpToolErrorMessage {
  type: 'mcp:tool.error';
  requestId: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

type McpMessage = McpToolInvokeMessage | McpToolResultMessage | McpToolErrorMessage;

// Tool execution function type
type ToolExecutor = (tool: string, params: Record<string, any>, options: { idempotencyKey?: string }) => Promise<any>;

export class UIToolBroker {
  private iframe: HTMLIFrameElement | null = null;
  private toolExecutor: ToolExecutor | null = null;
  private uiOrigin: string;
  private executionLog = new Map<string, any>(); // Simple idempotency cache

  constructor(uiOrigin: string) {
    if (!uiOrigin) {
      throw new Error('UI origin is required for secure communication');
    }
    this.uiOrigin = uiOrigin;
    console.log(\`[UIToolBroker] Initialized with origin: \${uiOrigin}\`);
  }

  /**
   * Attach broker to iframe with tool executor
   */
  attachToIframe(iframe: HTMLIFrameElement, toolExecutor: ToolExecutor): void {
    this.iframe = iframe;
    this.toolExecutor = toolExecutor;

    // Setup message listener for secure communication
    window.addEventListener('message', this.handleMessage.bind(this));

    console.log('[UIToolBroker] Attached to iframe with tool executor');
  }

  /**
   * Handle incoming messages from UI
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      // Step 1: Origin verification
      if (event.origin !== this.uiOrigin) {
        console.warn(\`[UIToolBroker] Rejected message from unauthorized origin: \${event.origin} (expected: \${this.uiOrigin})\`);
        return;
      }

      // Step 2: Message validation
      const message = event.data as McpMessage;
      if (!this.isValidMcpMessage(message)) {
        console.warn('[UIToolBroker] Received invalid MCP message:', message);
        return;
      }

      // Step 3: Handle tool invocation
      if (message.type === 'mcp:tool.invoke') {
        await this.handleToolInvocation(message);
      }

    } catch (error) {
      console.error('[UIToolBroker] Error handling message:', error);
    }
  }

  /**
   * Handle tool invocation with security checks
   */
  private async handleToolInvocation(message: McpToolInvokeMessage): Promise<void> {
    const { requestId, tool, params } = message;

    try {
      // Step 1: Tool allowlist validation
      if (!allowedTools.includes(tool as any)) {
        await this.sendError(requestId, {
          code: 'TOOL_NOT_ALLOWED',
          message: \`Tool '\${tool}' is not allowed for UI execution\`,
          details: { allowedTools }
        });
        return;
      }

      // Step 2: Idempotency check
      if (this.executionLog.has(requestId)) {
        console.log(\`[UIToolBroker] Returning cached result for requestId: \${requestId}\`);
        await this.sendResult(requestId, this.executionLog.get(requestId));
        return;
      }

      // Step 3: Tool execution
      if (!this.toolExecutor) {
        throw new Error('Tool executor not initialized');
      }

      console.log(\`[UIToolBroker] Executing tool: \${tool} with params:\`, params);
      
      const result = await this.toolExecutor(tool, params, {
        idempotencyKey: requestId
      });

      // Step 4: Cache and return result
      this.executionLog.set(requestId, result);
      await this.sendResult(requestId, result);

    } catch (error) {
      console.error(\`[UIToolBroker] Tool execution failed for \${tool}:\`, error);
      await this.sendError(requestId, {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: { tool, params }
      });
    }
  }

  /**
   * Send result back to UI
   */
  private async sendResult(requestId: string, result: any): Promise<void> {
    if (!this.iframe?.contentWindow) {
      console.error('[UIToolBroker] Cannot send result - iframe not available');
      return;
    }

    const message: McpToolResultMessage = {
      type: 'mcp:tool.result',
      requestId,
      result
    };

    this.iframe.contentWindow.postMessage(message, this.uiOrigin);
    console.log(\`[UIToolBroker] Sent result for requestId: \${requestId}\`);
  }

  /**
   * Send error back to UI
   */
  private async sendError(requestId: string, error: { code: string; message: string; details?: any }): Promise<void> {
    if (!this.iframe?.contentWindow) {
      console.error('[UIToolBroker] Cannot send error - iframe not available');
      return;
    }

    const message: McpToolErrorMessage = {
      type: 'mcp:tool.error',
      requestId,
      error
    };

    this.iframe.contentWindow.postMessage(message, this.uiOrigin);
    console.log(\`[UIToolBroker] Sent error for requestId: \${requestId}\`, error);
  }

  /**
   * Validate MCP message structure
   */
  private isValidMcpMessage(message: any): message is McpMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const { type, requestId } = message;
    
    if (!type || !requestId) {
      return false;
    }

    switch (type) {
      case 'mcp:tool.invoke':
        return typeof message.tool === 'string' && 
               typeof message.params === 'object';
      case 'mcp:tool.result':
      case 'mcp:tool.error':
        return true;
      default:
        return false;
    }
  }

  /**
   * Send bootstrap data to UI after initial load
   */
  async sendBootstrap(initialData: Record<string, any>): Promise<void> {
    if (!this.iframe?.contentWindow) {
      console.error('[UIToolBroker] Cannot send bootstrap - iframe not available');
      return;
    }

    const message = {
      type: 'mcp:bootstrap',
      data: initialData
    };

    this.iframe.contentWindow.postMessage(message, this.uiOrigin);
    console.log('[UIToolBroker] Sent bootstrap data:', Object.keys(initialData));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    window.removeEventListener('message', this.handleMessage.bind(this));
    this.iframe = null;
    this.toolExecutor = null;
    this.executionLog.clear();
    console.log('[UIToolBroker] Destroyed');
  }
}

// Factory function for easy initialization
export function createUIToolBroker(uiOrigin: string): UIToolBroker {
  return new UIToolBroker(uiOrigin);
}

// Export types for external use
export type { McpToolInvokeMessage, McpToolResultMessage, McpToolErrorMessage, ToolExecutor };`;
  }

  /**
   * MCP UI Serverコードを生成
   */
  private generateMCPUIServer(): string {
    return `/**
 * MCP UI Server
 * 
 * Dedicated MCP server that serves UI components as tools
 * Returns HTML/JS content with UI specifications for host-mediated integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// UI tool imports
import { uiItemDashboard } from './tools/ui.customer.dashboard.js';

class MCPUIServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "ui-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  private setupToolHandlers(): void {
    // Register UI tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "ui.item.dashboard",
            description: "Item management dashboard UI component with search and CRUD capabilities",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of items to load initially",
                  default: 20
                },
                preset: {
                  type: "string", 
                  description: "UI preset configuration",
                  default: "default"
                }
              },
              additionalProperties: false
            }
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "ui.item.dashboard":
            return await uiItemDashboard(args || {}) as any;

          default:
            throw new Error(\`Unknown UI tool: \${name}\`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: "text",
              text: \`Error executing UI tool \${name}: \${errorMessage}\`,
            },
          ],
          isError: true,
        } as any;
      }
    });
  }

  private setupRequestHandlers(): void {
    // Handle server errors gracefully
    this.server.onerror = (error) => {
      console.error('[MCP UI Server] Error:', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('[MCP UI Server] Started successfully. Ready to serve UI components.');
  }
}

// Start server if this file is run directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const uiServer = new MCPUIServer();
  uiServer.start().catch((error) => {
    console.error('[MCP UI Server] Failed to start:', error);
    process.exit(1);
  });
}

export { MCPUIServer };`;
  }

  /**
   * Host Embedコードを生成
   */
  private generateHostEmbed(): string {
    return `/**
 * Host Embed Helper
 * 
 * Provides easy integration for chat UI hosts to embed MCP UI components
 * Handles needs bootstrapping, iframe management, and tool brokering
 */

import { createUIToolBroker, type ToolExecutor } from '../integration/ui-tool-broker.js';

interface McpClient {
  call(tool: string, params: Record<string, any>, options?: { idempotencyKey?: string }): Promise<any>;
}

interface UISpec {
  uri: string;
  content: {
    type: "rawHtml";
    htmlString: string;
  };
  needs: Array<{
    tool: string;
    params: Record<string, any>;
  }>;
  allowTools: string[];
}

interface EmbedOptions {
  container: HTMLElement;
  uiOrigin: string;
  mcpClient: McpClient;
  onError?: (error: Error) => void;
  onLoaded?: () => void;
}

export class MCPUIEmbed {
  private container: HTMLElement;
  private iframe: HTMLIFrameElement | null = null;
  private broker: ReturnType<typeof createUIToolBroker> | null = null;
  private mcpClient: McpClient;
  private uiOrigin: string;
  private onError?: (error: Error) => void;
  private onLoaded?: () => void;

  constructor(options: EmbedOptions) {
    this.container = options.container;
    this.uiOrigin = options.uiOrigin;
    this.mcpClient = options.mcpClient;
    this.onError = options.onError;
    this.onLoaded = options.onLoaded;
  }

  /**
   * Load and embed a UI component
   */
  async loadUI(uiTool: string, params: Record<string, any> = {}): Promise<void> {
    try {
      console.log(\`[MCPUIEmbed] Loading UI tool: \${uiTool}\`);

      // Step 1: Get UI specification from UI server
      const uiSpecResult = await this.mcpClient.call(uiTool, params);
      const uiSpec = this.parseUISpec(uiSpecResult);

      console.log(\`[MCPUIEmbed] UI spec loaded:\`, {
        uri: uiSpec.uri,
        needsCount: uiSpec.needs.length,
        allowToolsCount: uiSpec.allowTools.length
      });

      // Step 2: Execute needs to get initial data
      const initialData = await this.executeNeeds(uiSpec.needs);

      console.log(\`[MCPUIEmbed] Bootstrap data prepared:\`, Object.keys(initialData));

      // Step 3: Create and setup iframe
      await this.createIframe(uiSpec.content.htmlString);

      // Step 4: Setup tool broker
      this.setupBroker();

      // Step 5: Send bootstrap data once iframe is loaded
      await this.waitForIframeLoad();
      await this.broker?.sendBootstrap(initialData);

      console.log(\`[MCPUIEmbed] UI embedded successfully\`);
      this.onLoaded?.();

    } catch (error) {
      console.error('[MCPUIEmbed] Failed to load UI:', error);
      this.handleError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Parse UI specification from MCP tool result
   */
  private parseUISpec(result: any): UISpec {
    try {
      // Handle different result formats
      let specText: string;
      
      if (typeof result === 'string') {
        specText = result;
      } else if (result.content && Array.isArray(result.content)) {
        specText = result.content[0]?.text || '';
      } else if (result.text) {
        specText = result.text;
      } else {
        throw new Error('Invalid UI specification format');
      }

      const spec = JSON.parse(specText);
      
      // Validate required fields
      if (!spec.content?.htmlString) {
        throw new Error('UI specification missing HTML content');
      }
      
      return {
        uri: spec.uri || 'ui://unknown',
        content: spec.content,
        needs: spec.needs || [],
        allowTools: spec.allowTools || []
      };
    } catch (error) {
      throw new Error(\`Failed to parse UI specification: \${error instanceof Error ? error.message : 'Unknown error'}\`);
    }
  }

  /**
   * Execute needs to get initial bootstrap data
   */
  private async executeNeeds(needs: UISpec['needs']): Promise<Record<string, any>> {
    const initialData: Record<string, any> = {};

    if (needs.length === 0) {
      return initialData;
    }

    console.log(\`[MCPUIEmbed] Executing \${needs.length} needs...\`);

    // Execute needs in parallel for better performance
    const needPromises = needs.map(async (need) => {
      try {
        console.log(\`[MCPUIEmbed] Executing need: \${need.tool}\`, need.params);
        const result = await this.mcpClient.call(need.tool, need.params);
        return { tool: need.tool, result };
      } catch (error) {
        console.warn(\`[MCPUIEmbed] Need failed: \${need.tool}\`, error);
        return { tool: need.tool, result: null, error };
      }
    });

    const needResults = await Promise.all(needPromises);

    // Collect results
    for (const { tool, result, error } of needResults) {
      if (result !== null) {
        initialData[tool] = result;
      } else if (error) {
        console.warn(\`[MCPUIEmbed] Need '\${tool}' failed:\`, error);
        // Continue with other needs even if some fail
      }
    }

    console.log(\`[MCPUIEmbed] Needs execution completed:\`, Object.keys(initialData));
    return initialData;
  }

  /**
   * Create iframe with UI content
   */
  private async createIframe(htmlContent: string): Promise<void> {
    // Clear container
    this.container.innerHTML = '';

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.style.borderRadius = '8px';
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    
    // Create blob URL for iframe content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    this.iframe.src = blobUrl;

    // Add to container
    this.container.appendChild(this.iframe);

    // Cleanup blob URL after load
    this.iframe.addEventListener('load', () => {
      URL.revokeObjectURL(blobUrl);
    });
  }

  /**
   * Setup tool broker for iframe communication
   */
  private setupBroker(): void {
    if (!this.iframe) {
      throw new Error('Cannot setup broker: iframe not created');
    }

    this.broker = createUIToolBroker(this.uiOrigin);

    // Create tool executor that uses MCP client
    const toolExecutor: ToolExecutor = async (tool, params, options) => {
      console.log(\`[MCPUIEmbed] Executing tool via broker: \${tool}\`, params);
      return await this.mcpClient.call(tool, params, options);
    };

    this.broker.attachToIframe(this.iframe, toolExecutor);
  }

  /**
   * Wait for iframe to load completely
   */
  private async waitForIframeLoad(): Promise<void> {
    if (!this.iframe) {
      throw new Error('Iframe not available');
    }

    return new Promise((resolve, reject) => {
      if (this.iframe!.contentDocument?.readyState === 'complete') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Iframe load timeout'));
      }, 10000);

      this.iframe!.addEventListener('load', () => {
        clearTimeout(timeout);
        // Additional delay to ensure scripts are initialized
        setTimeout(resolve, 100);
      });
    });
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('[MCPUIEmbed] Error:', error);
    
    // Show error in container
    this.container.innerHTML = \`
      <div style="
        padding: 20px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #dc2626;
        text-align: center;
      ">
        <strong>Error loading UI:</strong><br>
        \${error.message}
      </div>
    \`;

    this.onError?.(error);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.broker) {
      this.broker.destroy();
      this.broker = null;
    }
    
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    
    this.container.innerHTML = '';
    console.log('[MCPUIEmbed] Destroyed');
  }
}

/**
 * Convenience function to quickly embed a UI
 */
export async function embedMCPUI(options: EmbedOptions & { uiTool: string; params?: Record<string, any> }): Promise<MCPUIEmbed> {
  const embed = new MCPUIEmbed(options);
  await embed.loadUI(options.uiTool, options.params || {});
  return embed;
}

// Export types for external use
export type { McpClient, UISpec, EmbedOptions };`;
  }

  /**
   * Package.jsonを生成
   */
  private async generatePackageJson(
    tool: GeneratedTool, 
    outputDir: string, 
    options: IntegratedGenerationOptions
  ): Promise<void> {
    const packageJson = {
      name: tool.name.replace(/[^a-z0-9-]/g, '-').toLowerCase(),
      version: '1.0.0',
      description: tool.description,
      type: 'module',
      main: 'index.js',
      scripts: {
        'build': 'tsc',
        'dev': 'tsc --watch',
        'start': 'node index.js',
        'db:migrate': 'node scripts/migrate.js',
        'db:seed': 'node scripts/seed.js',
        'test': 'node --test tests/*.test.js'
      },
      dependencies: {
        '@modelcontextprotocol/sdk': '^1.0.0',
        'zod': '^3.22.0',
        'pg': '^8.11.0',
        'dotenv': '^16.3.0'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        '@types/pg': '^8.10.0',
        'typescript': '^5.0.0'
      }
    };

    await fs.writeFile(join(outputDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  }

  /**
   * READMEを生成
   */
  private async generateReadme(
    tool: GeneratedTool, 
    outputDir: string, 
    options: IntegratedGenerationOptions
  ): Promise<void> {
    const readme = `# ${tool.name}

${tool.description}

## Features

- **Schema-first Design**: Single source of truth with Zod schemas
- **Type Safety**: Full TypeScript support with automatic type generation
- **MCP Integration**: Native Model Context Protocol support
${options.withUI ? '- **UI Components**: Automatically generated web forms and views' : ''}
${options.withUI ? '- **Safe Communication**: Origin-verified postMessage with idempotency' : ''}
- **Database Ready**: PostgreSQL with migrations and seeding
- **Docker Support**: Production-ready containerization

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your database credentials
   \`\`\`

3. Run database migrations:
   \`\`\`bash
   npm run db:migrate
   \`\`\`

4. Build and start:
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

## Architecture

\`\`\`
${options.withUI ? 'UI Components (HTML/JS)' : 'MCP Client'}
       ↓
MCP Tools (API Layer)
       ↓
Business Logic (Pure Functions)
       ↓
DAO Layer (Direct SQL)
       ↓
PostgreSQL Database
\`\`\`

## Available Tools

${tool.operations.map(op => `- **${op.name}**: ${op.description || 'No description'}`).join('\n')}

## Entities

${tool.entities.map(entity => `- **${entity.name}**: ${entity.fields.map(f => f.name).join(', ')}`).join('\n')}

${options.withUI ? `
## UI Components

Each entity automatically generates:

- **Create Form**: Add new records
- **Edit Form**: Modify existing records  
- **List View**: Browse and filter records
- **Detail View**: View complete record details
- **Search**: Full-text search across fields

Access UI components via MCP resources:
\`\`\`
ui://entityname/create-form
ui://entityname/list-view
\`\`\`
` : ''}

## Development

- **Build**: \`npm run build\`
- **Watch**: \`npm run dev\` 
- **Test**: \`npm test\`
- **Migrate**: \`npm run db:migrate\`

## Docker Deployment

\`\`\`bash
docker-compose up -d
docker-compose exec app npm run db:migrate
\`\`\`

Generated with [MCP Tool Builder](https://github.com/your-org/mcp-tool-builder) 🚀
`;

    await fs.writeFile(join(outputDir, 'README.md'), readme);
  }

  /**
   * Dockerファイルを生成
   */
  private async generateDockerFiles(tool: GeneratedTool, outputDir: string): Promise<void> {
    // Dockerfile
    const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

# Switch to non-root user
USER nodejs

EXPOSE 3000

CMD ["node", "index.js"]
`;

    await fs.writeFile(join(outputDir, 'Dockerfile'), dockerfile);

    // docker-compose.yml
    const dockerCompose = `services:
  app:
    build: .
    container_name: ${tool.name.replace(/[^a-z0-9-]/g, '-').toLowerCase()}
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/${tool.name.replace(/[^a-z0-9_]/g, '_').toLowerCase()}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    networks:
      - ${tool.name.replace(/[^a-z0-9-]/g, '-').toLowerCase()}-network
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    container_name: ${tool.name.replace(/[^a-z0-9-]/g, '-').toLowerCase()}-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${tool.name.replace(/[^a-z0-9_]/g, '_').toLowerCase()}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - ${tool.name.replace(/[^a-z0-9-]/g, '-').toLowerCase()}-network
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:

networks:
  ${tool.name.replace(/[^a-z0-9-]/g, '-').toLowerCase()}-network:
    driver: bridge
`;

    await fs.writeFile(join(outputDir, 'docker-compose.yml'), dockerCompose);
  }

  /**
   * 開発スクリプトを生成
   */
  private async generateDevelopmentScripts(tool: GeneratedTool, outputDir: string): Promise<void> {
    // Migration script
    const migrateScript = `#!/usr/bin/env node

import { Pool } from 'pg';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigrations() {
  try {
    // Create migrations table
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`);

    // Get executed migrations
    const { rows: executedMigrations } = await pool.query(
      'SELECT filename FROM migrations ORDER BY executed_at'
    );
    const executedFiles = new Set(executedMigrations.map(row => row.filename));

    // Get migration files
    const migrationFiles = await readdir(join(process.cwd(), 'migrations'));
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Execute pending migrations
    for (const file of sqlFiles) {
      if (executedFiles.has(file)) {
        console.log(\`⏭️  Skipping \${file} (already executed)\`);
        continue;
      }

      console.log(\`🔄 Running migration: \${file}\`);
      
      const sql = await readFile(join(process.cwd(), 'migrations', file), 'utf-8');
      
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log(\`✅ Migration \${file} completed\`);
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(\`❌ Migration \${file} failed:\`, error);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
`;

    await fs.writeFile(join(outputDir, 'scripts', 'migrate.js'), migrateScript, { mode: 0o755 });

    // TypeScript config
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'ES2020',
        moduleResolution: 'node',
        outDir: './dist',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        lib: ['ES2020', 'DOM']
      },
      include: [
        'index.ts',
        'mcp-server.ts',
        'schemas/**/*.ts',
        'mcp-tools/**/*.ts',
        'business-logic/**/*.ts',
        'integration/**/*.ts',
        'mcp-ui-server/**/*.ts',
        'host/**/*.ts'
      ],
      exclude: ['node_modules', 'dist']
    };

    await fs.writeFile(join(outputDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

    // Environment example
    const envExample = `# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${tool.name.replace(/[^a-z0-9_]/g, '_').toLowerCase()}

# Application Configuration
NODE_ENV=development
PORT=3000

# UI Configuration (if using UI features)
UI_ORIGIN=https://localhost:3000
`;

    await fs.writeFile(join(outputDir, '.env.example'), envExample);
  }

  // Helper methods
  private getOperationType(operationName: string): string {
    if (operationName.startsWith('create')) return 'create';
    if (operationName.startsWith('update') || operationName.startsWith('edit')) return 'update';
    if (operationName.startsWith('delete') || operationName.startsWith('remove')) return 'delete';
    if (operationName.startsWith('list') || operationName.startsWith('get') && operationName.includes('s')) return 'list';
    if (operationName.startsWith('search') || operationName.startsWith('find')) return 'search';
    return 'create';
  }

  private getInputSchemaImport(operationName: string, entityName: string): string {
    const opType = this.getOperationType(operationName);
    switch (opType) {
      case 'create': return `Create${entityName}Input`;
      case 'update': return `Update${entityName}Input`;
      case 'list': return `List${entityName}Input`;
      case 'search': return `Search${entityName}Input`;
      default: return `Create${entityName}Input`;
    }
  }

  private getOutputSchemaImport(operationName: string, entityName: string): string {
    const opType = this.getOperationType(operationName);
    switch (opType) {
      case 'create': return `Create${entityName}Output`;
      case 'update': return `Update${entityName}Output`;
      case 'list': return `List${entityName}Output`;
      case 'search': return `Search${entityName}Output`;
      case 'delete': return `DeleteResult`;
      case 'get': return `${entityName}`;
      default: return `Create${entityName}Output`;
    }
  }

  private getInputSchemaName(operationName: string, entityName: string): string {
    return this.getInputSchemaImport(operationName, entityName);
  }

  private getOutputSchemaName(operationName: string, entityName: string): string {
    return this.getOutputSchemaImport(operationName, entityName);
  }

  private getInputTypeName(operationName: string, entityName: string): string {
    return this.getInputSchemaImport(operationName, entityName) + 'Type';
  }

  private getOutputTypeName(operationName: string, entityName: string): string {
    return this.getOutputSchemaImport(operationName, entityName) + 'Type';
  }

  private generateToolLogic(operationName: string, entityName: string): string {
    const opType = this.getOperationType(operationName);
    
    switch (opType) {
      case 'create':
        return `const result = await dao.create(validated);
        return result;`;
      case 'update':
        return `const { id, ...updateData } = validated;
        const result = await dao.update(id, updateData);
        if (!result) {
          throw new Error('${entityName} not found');
        }
        return result;`;
      case 'delete':
        return `const result = await dao.delete(validated.id);
        if (!result) {
          throw new Error('${entityName} not found');
        }
        return { success: true };`;
      case 'list':
        return `const { page, limit, sortBy, order, ...filters } = validated;
        const items = await dao.findAll(filters);
        return {
          items,
          total: items.length,
          page,
          limit
        };`;
      case 'search':
        return `// Implement search logic here
        const items = await dao.findAll();
        const filtered = items.filter(item => 
          validated.fields.some(field => {
            const value = (item as any)[field];
            return value && value.toString().toLowerCase().includes(validated.query.toLowerCase());
          })
        );
        return {
          items: filtered,
          total: filtered.length
        };`;
      default:
        return `// Implement custom logic here
        const result = await dao.create(validated);
        return result;`;
    }
  }

  private generateBusinessRules(entity: Entity, operationName: string): string {
    return `// TODO: Implement business rules
    // Example rules:
    // - Validate business constraints
    // - Check permissions
    // - Apply business logic
    // - Send notifications`;
  }

  private generateDatabaseOperation(operationName: string, entityName: string): string {
    return this.generateToolLogic(operationName, entityName);
  }
}