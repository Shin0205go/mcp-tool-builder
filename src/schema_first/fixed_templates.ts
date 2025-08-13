/**
 * Fixed ABI Templates
 * 実装形状を固定し、テンプレート生成エラーを防ぐ
 */

import { BuilderSpec, Entity, Action } from './spec_sanitizer.js';

/**
 * 固定ABIテンプレート生成器
 */
export class FixedTemplateGenerator {
  
  /**
   * メインサーバー（固定dispatcher + 引数抽出互換）
   */
  generateMainServer(spec: BuilderSpec): string {
    const actionImports = spec.actions.map(action => 
      `import * as ${action.name}Module from './mcp-tools/${action.name}.js';`
    ).join('\n');
    
    const handlerEntries = spec.actions.map(action => 
      `  "${action.name}": { input: ${action.name}Module.Input, run: ${action.name}Module.${action.name} }`
    ).join(',\n');
    
    return `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
${actionImports}

const Invoke = z.object({
  method: z.string().min(1),
  params: z.unknown().optional()
});

// フラット({ ... }) と MCP風({ name, arguments, _meta }) を吸収
function extractArgs(raw: unknown): unknown {
  const p = (raw ?? {}) as any;
  if (p && typeof p === "object") {
    if ("arguments" in p && p.arguments != null) return p.arguments;
    if ("args" in p && p.args != null) return p.args;
  }
  return raw ?? {};
}

type Handler = { input: z.ZodTypeAny; run: (p: any, ctx?: any) => Promise<any> };

// 自動列挙handlers（ツール追加漏れ防止）
const handlers: Record<string, Handler> = {
${handlerEntries}
};

export class ${spec.name}Server {
  private server: Server;
  
  constructor() {
    this.server = new Server(
      { name: '${spec.name}', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    
    this.setupToolHandlers();
    this.setupMCPHandlers();
  }
  
  private setupToolHandlers(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const context = { 
        userId: 'system',
        idempotencyKey: request.params?.idempotencyKey 
      };
      
      // 固定dispatcher with argument extraction
      const method = request.params.name;
      const h = handlers[method];
      if (!h) {
        throw new Error(\`Unknown tool: \${method}\`);
      }

      const args = extractArgs(request.params);
      const parsed = h.input.parse(args ?? {});
      const result = await h.run(parsed, context);
      
      // MCP準拠のレスポンス形式
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    });
  }
  
  private setupMCPHandlers(): void {
    // ① tools/list - ツール一覧を返す
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Object.entries(handlers).map(([name, h]) => ({
        name,
        description: \`Tool for \${name} operation\`,
        // $refを使わずインライン化（トップにtype:"object"が出る）
        inputSchema: zodToJsonSchema(h.input, { $refStrategy: 'none' })
      }));
      return { tools };
    });

    // ② resources/list - 空配列を返す（今後実装可能）
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: []
    }));

    // ③ prompts/list - 空配列を返す（今後実装可能）
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: []
    }));
  }
  
  async start(): Promise<void> {
    // StdioServerTransportクラスを使用（Claude Desktopで動作）
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// メイン実行
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const server = new ${spec.name}Server();
  server.start().catch(console.error);
}`;
  }
  
  /**
   * MCPツール（固定export形式）
   */
  generateMcpTool(action: Action, entity: Entity): string {
    const inputSchema = this.generateInputSchema(action, entity);
    const outputSchema = this.generateOutputSchema(action, entity);
    
    return `import { z } from 'zod';
import { ${entity.name}Schema, DeleteResultSchema } from '../schemas/${entity.name.toLowerCase()}.js';
import { ${action.name}Logic } from '../business-logic/${action.name}.js';

// 固定ABI: Input/Output schemas
export const Input = ${inputSchema};
export const Output = ${outputSchema};

// 固定ABI: Tool function
export async function ${action.name}(
  input: z.infer<typeof Input>,
  context: { userId?: string; idempotencyKey?: string } = {}
): Promise<z.infer<typeof Output>> {
  // Input validation
  const validated = Input.parse(input);
  
  // Business logic execution
  const result = await ${action.name}Logic(validated, context);
  
  // Output validation
  return Output.parse(result);
}`;
  }
  
  /**
   * ビジネスロジック（固定シグネチャ）
   */
  generateBusinessLogic(action: Action, entity: Entity): string {
    const logic = this.getActionLogic(action, entity);
    
    return `import { ${entity.name}DAO } from '../dao/${entity.name}DAO.js';
import { Input, Output } from '../mcp-tools/${action.name}.js';
import { z } from 'zod';

// 固定ABI: Business logic function
export async function ${action.name}Logic(
  input: z.infer<typeof Input>,
  context: { userId?: string; idempotencyKey?: string } = {}
): Promise<z.infer<typeof Output>> {
  
  const dao = new ${entity.name}DAO();
  
  ${logic}
}`;
  }
  
  /**
   * DAO（固定CRUD形式）
   */
  generateDAO(entity: Entity): string {
    const tableName = entity.name.toLowerCase() + 's';
    
    return `import { Pool } from 'pg';
import { ${entity.name}Schema } from '../schemas/${entity.name.toLowerCase()}.js';
import { z } from 'zod';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export type ${entity.name}Type = z.infer<typeof ${entity.name}Schema>;

// 固定ABI: DAO class
export class ${entity.name}DAO {
  
  async create(data: Partial<${entity.name}Type>): Promise<${entity.name}Type> {
    // null/undefined 正規化
    const sanitized = this.sanitizeInput(data);
    
    const fields = Object.keys(sanitized);
    const values = Object.values(sanitized);
    const placeholders = fields.map((_, i) => \`$\${i + 1}\`).join(', ');
    
    const query = \`
      INSERT INTO ${tableName} (\${fields.join(', ')})
      VALUES (\${placeholders})
      RETURNING *
    \`;
    
    const result = await pool.query(query, values);
    return ${entity.name}Schema.parse(result.rows[0]);
  }
  
  async findById(id: string): Promise<${entity.name}Type | null> {
    const result = await pool.query(
      'SELECT * FROM ${tableName} WHERE id = $1',
      [id]
    );
    
    return result.rows[0] ? ${entity.name}Schema.parse(result.rows[0]) : null;
  }
  
  async update(id: string, data: Partial<${entity.name}Type>): Promise<${entity.name}Type | null> {
    // null/undefined 正規化
    const sanitized = this.sanitizeInput(data);
    
    const fields = Object.keys(sanitized);
    const values = Object.values(sanitized);
    const setClause = fields.map((field, i) => \`\${field} = $\${i + 2}\`).join(', ');
    
    const query = \`
      UPDATE ${tableName}
      SET \${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    \`;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] ? ${entity.name}Schema.parse(result.rows[0]) : null;
  }
  
  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM ${tableName} WHERE id = $1',
      [id]
    );
    
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async findAll(filters: Record<string, any> = {}): Promise<${entity.name}Type[]> {
    let query = 'SELECT * FROM ${tableName}';
    const values: any[] = [];
    
    // 安全なフィルタリング（type assertion回避）
    const whereConditions: string[] = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(filters)) {
      if (value != null && this.isValidFilterField(key)) {
        whereConditions.push(\`\${key} = $\${paramIndex}\`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (whereConditions.length > 0) {
      query += \` WHERE \${whereConditions.join(' AND ')}\`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, values);
    return result.rows.map(row => ${entity.name}Schema.parse(row));
  }
  
  // Input sanitization (undefined → null/empty string)
  private sanitizeInput(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        // NOT NULL columns get empty string, nullable get null
        sanitized[key] = this.isRequiredField(key) ? '' : null;
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  // Field validation for safe filtering
  private isValidFilterField(field: string): boolean {
    const allowedFields = ['id', 'created_at', 'updated_at', ${entity.fields.map(f => `'${f.name}'`).join(', ')}];
    return allowedFields.includes(field);
  }
  
  // Required field check for sanitization
  private isRequiredField(field: string): boolean {
    const requiredFields = [${entity.fields.filter(f => f.required).map(f => `'${f.name}'`).join(', ')}];
    return requiredFields.includes(field);
  }
}`;
  }
  
  /**
   * Zodスキーマ（固定形式、重複排除済み）
   */
  generateZodSchema(entity: Entity): string {
    // 重複フィールド除去（Mapで先勝ち）
    const uniqueFields = this.deduplicateFields([
      // 基本フィールドを最初に追加
      { name: 'id', type: 'uuid', required: false },
      { name: 'created_at', type: 'datetime', required: false },
      { name: 'updated_at', type: 'datetime', required: false },
      // エンティティフィールドを追加（重複は無視される）
      ...entity.fields
    ]);
    
    const fieldDefinitions = uniqueFields.map(field => 
      `  ${field.name}: ${this.getZodType(field.type, field.required)}`
    ).join(',\n');
    
    return `import { z } from 'zod';

// Base schema (single source of truth)
export const ${entity.name}Schema = z.object({
${fieldDefinitions}
});

// Standard delete result
export const DeleteResultSchema = z.object({
  success: z.boolean()
});

// Type exports
export type ${entity.name}Type = z.infer<typeof ${entity.name}Schema>;
export type DeleteResultType = z.infer<typeof DeleteResultSchema>;
`;
  }
  
  /**
   * フィールド重複除去（先勝ち）
   */
  private deduplicateFields(fields: Array<{name: string, type: string, required: boolean}>): Array<{name: string, type: string, required: boolean}> {
    const seen = new Map<string, {name: string, type: string, required: boolean}>();
    
    for (const field of fields) {
      if (!seen.has(field.name)) {
        seen.set(field.name, field);
      }
    }
    
    return Array.from(seen.values());
  }
  
  // Helper methods
  private generateInputSchema(action: Action, entity: Entity): string {
    switch (action.type) {
      case 'create':
        return `${entity.name}Schema.omit({ id: true, created_at: true, updated_at: true })`;
      case 'get':
      case 'delete':
        return `z.object({ id: z.string().uuid() })`;
      case 'update':
        return `z.object({ id: z.string().uuid() }).merge(${entity.name}Schema.omit({ id: true, created_at: true, updated_at: true }).partial())`;
      case 'list':
        return `z.object({ page: z.number().default(1), limit: z.number().default(20) })`;
      case 'search':
        return `z.object({ query: z.string().min(1), fields: z.array(z.string()).default([]) })`;
      default:
        return `z.object({})`;
    }
  }
  
  private generateOutputSchema(action: Action, entity: Entity): string {
    switch (action.type) {
      case 'delete':
        return `DeleteResultSchema`;
      case 'list':
      case 'search':
        return `z.object({ items: z.array(${entity.name}Schema), total: z.number() })`;
      default:
        return `${entity.name}Schema`;
    }
  }
  
  private getActionLogic(action: Action, entity: Entity): string {
    switch (action.type) {
      case 'create':
        return `return await dao.create(input);`;
      case 'get':
        return `
  const result = await dao.findById(input.id);
  if (!result) {
    throw new Error('${entity.name} not found');
  }
  return result;`;
      case 'update':
        return `
  const { id, ...updateData } = input;
  const result = await dao.update(id, updateData);
  if (!result) {
    throw new Error('${entity.name} not found');
  }
  return result;`;
      case 'delete':
        return `
  const success = await dao.delete(input.id);
  if (!success) {
    throw new Error('${entity.name} not found');
  }
  return { success: true };`;
      case 'list':
        return `
  const items = await dao.findAll();
  return {
    items: items.slice((input.page - 1) * input.limit, input.page * input.limit),
    total: items.length
  };`;
      case 'search':
        return `
  const allItems = await dao.findAll();
  const filtered = allItems.filter(item => {
    const searchText = input.query.toLowerCase();
    return input.fields.some(field => {
      const value = (item as any)[field];
      return value && value.toString().toLowerCase().includes(searchText);
    });
  });
  
  return {
    items: filtered,
    total: filtered.length
  };`;
      default:
        return `throw new Error('Action type not implemented: ${action.type}');`;
    }
  }
  
  private getZodType(type: string, required: boolean): string {
    const baseType = (() => {
      switch (type) {
        case 'string': return 'z.string()';
        case 'number': return 'z.number()';
        case 'boolean': return 'z.boolean()';
        case 'uuid': return 'z.string().uuid()';
        case 'email': return 'z.string().email()';
        case 'date': return 'z.string().date()';
        case 'datetime': return 'z.string().datetime()';
        case 'phone': return 'z.string().regex(/^[+]?[0-9\\-\\s\\(\\)]+$/)';
        case 'price': return 'z.number().positive()';
        default: return 'z.string()';
      }
    })();
    
    return required ? baseType : `${baseType}.optional()`;
  }
}

export function createFixedTemplateGenerator(): FixedTemplateGenerator {
  return new FixedTemplateGenerator();
}