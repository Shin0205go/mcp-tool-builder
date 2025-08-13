/**
 * LLM-in-the-Loop Generator
 * LLMによる仕様生成 + 固定テンプレートによる実装合成
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createSpecSanitizer, BuilderSpec, SpecSanitizer } from './spec_sanitizer.js';
import { createFixedTemplateGenerator, FixedTemplateGenerator } from './fixed_templates.js';
import { 
  createLLMOutputValidator, 
  LLMOutputValidator, 
  generateJsonOnlyPrompt,
  ValidatedBuilderSpec 
} from './json_schema_validator.js';

export interface LLMInTheLoopOptions {
  outputDir: string;
  withUI?: boolean;
  uiOrigin?: string;
  maxRetries?: number;
  validateTypeScript?: boolean;
}

/**
 * LLM-in-the-Loop パイプライン
 */
export class LLMInTheLoopGenerator {
  
  constructor(
    private llmProvider: LLMProvider,
    private sanitizer: SpecSanitizer = createSpecSanitizer(),
    private templateGen: FixedTemplateGenerator = createFixedTemplateGenerator(),
    private validator: LLMOutputValidator = createLLMOutputValidator()
  ) {}
  
  /**
   * メイン生成パイプライン
   */
  async generate(requirement: string, options: LLMInTheLoopOptions): Promise<void> {
    console.log('🔍 Starting LLM-in-the-Loop generation...');
    
    // Step 1: LLMに仕様生成を依頼（JSON限定）
    const rawSpec = await this.getLLMSpecification(requirement, options.maxRetries || 3);
    console.log(`✅ LLM generated specification for: ${rawSpec.name}`);
    
    // Step 2: サニタイザで正規化
    const sanitizedSpec = this.sanitizer.sanitize(rawSpec);
    console.log('✅ Specification sanitized and normalized');
    
    // Step 3: 固定テンプレートでコード合成
    await this.synthesizeCode(sanitizedSpec, options);
    console.log('✅ Code synthesis complete');
    
    // Step 4: 自己検証（TypeScript validation既定ON）
    if (options.validateTypeScript) {
      console.log('🔍 Running TypeScript validation...');
      const isValid = await this.validateGeneratedTypeScript(options.outputDir);
      if (!isValid) {
        throw new Error('TypeScript validation failed. Generated code has compilation errors. Use --no-validate-ts to skip validation.');
      } else {
        console.log('✅ TypeScript validation passed');
      }
    } else {
      // 基本的なファイル存在チェックのみ
      const isValid = await this.validateGenerated(options.outputDir);
      if (!isValid) {
        throw new Error('File structure validation failed. Missing required files.');
      } else {
        console.log('✅ File structure validated successfully');
      }
    }
    
    console.log(`🎉 Generation complete: ${options.outputDir}`);
  }
  
  /**
   * Step 1: LLM仕様生成（再試行ループ付き）
   */
  private async getLLMSpecification(requirement: string, maxRetries: number): Promise<ValidatedBuilderSpec> {
    let lastError = '';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 LLM attempt ${attempt}/${maxRetries}...`);
        
        const prompt = attempt === 1 
          ? generateJsonOnlyPrompt(requirement)
          : this.validator.generateRetryPrompt(requirement, lastError);
        
        const response = await this.llmProvider.generate(prompt);
        const validated = this.validator.validate(response);
        
        console.log(`✅ LLM success on attempt ${attempt}`);
        return validated;
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.log(`❌ LLM attempt ${attempt} failed: ${lastError}`);
        
        if (attempt === maxRetries) {
          throw new Error(`LLM failed after ${maxRetries} attempts. Last error: ${lastError}`);
        }
      }
    }
    
    throw new Error('Unexpected: should not reach here');
  }
  
  /**
   * Step 3: コード合成（固定テンプレート）
   */
  private async synthesizeCode(spec: BuilderSpec, options: LLMInTheLoopOptions): Promise<void> {
    const { outputDir } = options;
    
    // ディレクトリ構造作成
    await this.createDirectoryStructure(outputDir);
    
    // 各エンティティのファイル生成
    for (const entity of spec.entities) {
      const entityActions = spec.actions.filter(a => a.entity === entity.name);
      
      // Schemas
      const schemaCode = this.templateGen.generateZodSchema(entity);
      await fs.writeFile(join(outputDir, 'schemas', `${entity.name.toLowerCase()}.ts`), schemaCode);
      
      // DAO
      const daoCode = this.templateGen.generateDAO(entity);
      await fs.writeFile(join(outputDir, 'dao', `${entity.name}DAO.ts`), daoCode);
      
      // Actions (MCP Tools + Business Logic)
      for (const action of entityActions) {
        const mcpCode = this.templateGen.generateMcpTool(action, entity);
        await fs.writeFile(join(outputDir, 'mcp-tools', `${action.name}.ts`), mcpCode);
        
        const businessCode = this.templateGen.generateBusinessLogic(action, entity);
        await fs.writeFile(join(outputDir, 'business-logic', `${action.name}.ts`), businessCode);
      }
    }
    
    // Main server (固定dispatcher)
    const serverCode = this.templateGen.generateMainServer(spec);
    await fs.writeFile(join(outputDir, 'index.ts'), serverCode);
    
    // Package.json, tsconfig.json, etc.
    await this.generateProjectFiles(spec, outputDir);
    await this.generateMigrations(spec, outputDir);
    
    // UI統合ファイル（オプション）
    if (options.withUI && options.uiOrigin) {
      await this.generateUIIntegration(spec, outputDir, options.uiOrigin);
    }
  }
  
  /**
   * Step 4a: 基本ファイル構造検証
   */
  private async validateGenerated(outputDir: string): Promise<boolean> {
    try {
      // 基本的なファイル存在チェック
      const requiredFiles = ['package.json', 'tsconfig.json', 'index.ts'];
      for (const file of requiredFiles) {
        const filePath = join(outputDir, file);
        try {
          await fs.access(filePath);
        } catch {
          console.log(`Missing required file: ${file}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.log(`Validation error: ${error}`);
      return false;
    }
  }
  
  /**
   * Step 4b: TypeScript コンパイル検証（--validate-ts時のみ）
   */
  private async validateGeneratedTypeScript(outputDir: string): Promise<boolean> {
    try {
      const { spawn } = await import('child_process');
      const { promisify } = await import('util');
      const execFile = promisify(spawn);
      
      const result = await execFile('npx', ['tsc', '--noEmit'], {
        cwd: outputDir,
        stdio: 'pipe',
        timeout: 60000 // 60秒でタイムアウト
      }) as any;
      
      return result.exitCode === 0;
    } catch (error) {
      console.log(`TypeScript validation error: ${error}`);
      return false;
    }
  }
  
  /**
   * ディレクトリ構造作成
   */
  private async createDirectoryStructure(outputDir: string): Promise<void> {
    const dirs = [
      'schemas',
      'mcp-tools', 
      'business-logic',
      'dao',
      'migrations',
      'scripts',
      'tests'
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(join(outputDir, dir), { recursive: true });
    }
  }
  
  /**
   * プロジェクトファイル生成
   */
  private async generateProjectFiles(spec: BuilderSpec, outputDir: string): Promise<void> {
    // package.json
    const packageJson = {
      name: spec.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      description: spec.description || `Generated MCP tool: ${spec.name}`,
      type: 'module',
      main: 'index.js',
      scripts: {
        build: 'tsc',
        start: 'node index.js',
        dev: 'tsc --watch',
        test: 'node --test tests/*.test.js',
        'db:migrate': 'node scripts/migrate.js',
        'db:setup': 'npm run db:migrate'
      },
      dependencies: {
        '@modelcontextprotocol/sdk': '^1.0.0',
        'zod': '^3.22.0',
        'zod-to-json-schema': '^3.22.0',
        'pg': '^8.11.0',
        'dotenv': '^16.3.0'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        '@types/pg': '^8.10.0',
        'typescript': '^5.0.0'
      }
    };
    
    await fs.writeFile(
      join(outputDir, 'package.json'), 
      JSON.stringify(packageJson, null, 2)
    );
    
    // tsconfig.json (固定形式)
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
        'schemas/**/*.ts',
        'mcp-tools/**/*.ts',
        'business-logic/**/*.ts',
        'dao/**/*.ts'
      ],
      exclude: ['node_modules', 'dist']
    };
    
    await fs.writeFile(
      join(outputDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
    
    // .env.example
    const envExample = `DATABASE_URL=postgresql://user:password@localhost:5432/${spec.name.toLowerCase()}
NODE_ENV=development
`;
    await fs.writeFile(join(outputDir, '.env.example'), envExample);
    
    // Dockerfile
    const dockerfile = `FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/
COPY .env.example .env

EXPOSE 3000

CMD ["npm", "start"]
`;
    await fs.writeFile(join(outputDir, 'Dockerfile'), dockerfile);
    
    // docker-compose.yml
    const dockerCompose = `version: '3.8'

services:
  ${spec.name.toLowerCase()}:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/${spec.name.toLowerCase()}
    depends_on:
      - db
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${spec.name.toLowerCase()}
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

volumes:
  postgres_data:
`;
    await fs.writeFile(join(outputDir, 'docker-compose.yml'), dockerCompose);
    
    // Migration script
    const migrateScript = `#!/usr/bin/env node
import { Pool } from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Create migrations table if not exists
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    \`);
    
    // Get executed migrations
    const { rows: executed } = await pool.query('SELECT filename FROM migrations');
    const executedFiles = new Set(executed.map(row => row.filename));
    
    // Read migration files
    const migrationFiles = await readdir('./migrations');
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of sqlFiles) {
      if (!executedFiles.has(file)) {
        console.log(\`📄 Executing migration: \${file}\`);
        const sql = await readFile(join('./migrations', file), 'utf-8');
        
        await pool.query('BEGIN');
        try {
          await pool.query(sql);
          await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
          await pool.query('COMMIT');
          console.log(\`✅ Migration completed: \${file}\`);
        } catch (error) {
          await pool.query('ROLLBACK');
          throw error;
        }
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
`;
    await fs.writeFile(join(outputDir, 'scripts', 'migrate.js'), migrateScript);
  }
  
  /**
   * データベースマイグレーション生成
   */
  private async generateMigrations(spec: BuilderSpec, outputDir: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    
    for (const entity of spec.entities) {
      const tableName = entity.name.toLowerCase() + 's';
      const fileName = `${timestamp}-create-${tableName}-table.sql`;
      
      // Generate SQL DDL
      let sql = `-- Create ${entity.name} table\n`;
      sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      sql += `  id SERIAL PRIMARY KEY,\n`;
      
      for (const field of entity.fields) {
        // Skip auto-generated fields
        const fieldName = field.name.toLowerCase();
        if (['id', 'createdat', 'updatedat', 'created_at', 'updated_at'].includes(fieldName)) continue;
        
        const sqlType = this.mapFieldTypeToSQL(field.type);
        const nullable = field.required ? ' NOT NULL' : '';
        sql += `  ${fieldName} ${sqlType}${nullable},\n`;
      }
      
      sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
      sql += `  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
      sql += `);\n\n`;
      
      // Add indexes for common fields
      for (const field of entity.fields) {
        const fieldName = field.name.toLowerCase();
        if (['id', 'createdat', 'updatedat', 'created_at', 'updated_at'].includes(fieldName)) continue;
        
        if (fieldName.includes('email')) {
          sql += `CREATE INDEX IF NOT EXISTS idx_${tableName}_${fieldName} ON ${tableName}(${fieldName});\n`;
        } else if (fieldName.includes('name')) {
          sql += `CREATE INDEX IF NOT EXISTS idx_${tableName}_${fieldName} ON ${tableName}(${fieldName});\n`;
        }
      }
      
      await fs.writeFile(join(outputDir, 'migrations', fileName), sql);
      console.log(`📄 Generated migration: ${fileName}`);
    }
  }
  
  /**
   * フィールドタイプをSQL型にマップ
   */
  private mapFieldTypeToSQL(type: string): string {
    switch (type.toLowerCase()) {
      case 'string':
      case 'text':
        return 'TEXT';
      case 'number':
        return 'DECIMAL';
      case 'integer':
      case 'int':
        return 'INTEGER';
      case 'boolean':
      case 'bool':
        return 'BOOLEAN';
      case 'date':
      case 'datetime':
        return 'TIMESTAMP';
      case 'email':
        return 'VARCHAR(255)';
      case 'phone':
        return 'VARCHAR(20)';
      case 'url':
        return 'TEXT';
      case 'json':
      case 'object':
        return 'JSONB';
      default:
        return 'TEXT';
    }
  }

  /**
   * UI統合ファイル生成（オプション）
   */
  private async generateUIIntegration(spec: BuilderSpec, outputDir: string, uiOrigin: string): Promise<void> {
    // UI integration directories
    const uiDirs = ['integration', 'mcp-ui-server', 'mcp-ui-server/tools', 'host', 'ui-resources'];
    for (const dir of uiDirs) {
      await fs.mkdir(join(outputDir, dir), { recursive: true });
    }
    
    // UI broker (固定実装)
    const brokerCode = `import { UIToolBroker } from './ui-tool-broker.js';

export function setupUIBroker(uiOrigin: string = '${uiOrigin}') {
  return new UIToolBroker(uiOrigin);
}`;
    
    await fs.writeFile(join(outputDir, 'integration', 'ui-broker-setup.ts'), brokerCode);
    
    console.log(`🎨 UI integration generated for origin: ${uiOrigin}`);
  }
}

/**
 * LLMプロバイダーインターface
 */
export interface LLMProvider {
  generate(prompt: string): Promise<string>;
}

/**
 * ファクトリー関数
 */
export function createLLMInTheLoopGenerator(llmProvider: LLMProvider): LLMInTheLoopGenerator {
  return new LLMInTheLoopGenerator(llmProvider);
}