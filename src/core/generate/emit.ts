import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import ejs from 'ejs';
import type { Contract, Entity } from '../../injector/load.js';
import { TYPE_MAP, ZOD_MAP } from '../../injector/load.js';

export interface TemplateContext {
  name: string;
  description?: string;
  entities: Entity[];
  entity?: Entity;
  operation?: string;
  TYPE_MAP: typeof TYPE_MAP;
  ZOD_MAP: typeof ZOD_MAP;
  [key: string]: any;
}

/**
 * EJS template renderer with context
 */
export class TemplateEngine {
  constructor(private templatesDir: string) {}

  async render(templateName: string, context: TemplateContext): Promise<string> {
    const templatePath = join(this.templatesDir, templateName);
    const template = await fs.readFile(templatePath, 'utf-8');
    return ejs.render(template, context);
  }

  async renderToFile(templateName: string, context: TemplateContext, outputPath: string): Promise<void> {
    const content = await this.render(templateName, context);
    await fs.mkdir(dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content);
  }
}

/**
 * Generate all files from contract
 */
export class SchemaFirstGenerator {
  private templates: TemplateEngine;

  constructor(templatesDir: string) {
    this.templates = new TemplateEngine(templatesDir);
  }

  async generate(contract: Contract, outputDir: string): Promise<void> {
    const baseContext: TemplateContext = {
      name: contract.name,
      description: contract.description,
      entities: contract.entities,
      TYPE_MAP,
      ZOD_MAP
    };

    // 1. Generate constants (protocol version, error schema)
    await this.templates.renderToFile(
      'constants.ts.ejs',
      baseContext,
      join(outputDir, 'generated/constants.ts')
    );

    // 2. Generate types (ToolSpec)
    await this.templates.renderToFile(
      'types.ts.ejs',
      baseContext,
      join(outputDir, 'generated/types.ts')
    );

    // 3. Generate schemas
    for (const entity of contract.entities) {
      await this.templates.renderToFile(
        'schema.ts.ejs',
        { ...baseContext, entity },
        join(outputDir, 'generated/schemas', `${entity.name.toLowerCase()}.ts`)
      );
    }

    // 4. Generate adapters  
    for (const entity of contract.entities) {
      await this.templates.renderToFile(
        'adapters.ts.ejs', 
        { ...baseContext, entity },
        join(outputDir, 'generated/adapters', `${entity.name.toLowerCase()}.ts`)
      );
    }

    // 5. Generate tools
    for (const entity of contract.entities) {
      const operations = [
        { op: 'create', inputs: `Create${entity.name}Input`, outputs: `${entity.name}Schema`, description: `Create a new ${entity.name.toLowerCase()}` },
        { op: 'get', inputs: `Get${entity.name}Input`, outputs: `${entity.name}Schema`, description: `Get ${entity.name.toLowerCase()} by ID` },
        { op: 'update', inputs: `Update${entity.name}Input`, outputs: `${entity.name}Schema`, description: `Update ${entity.name.toLowerCase()}` },
        { op: 'delete', inputs: `Delete${entity.name}Input`, outputs: `DeleteResultSchema`, description: `Delete ${entity.name.toLowerCase()}` },
        { op: 'list', inputs: `List${entity.name}sInput`, outputs: `${entity.name}Schema`, outputsArray: true, description: `List ${entity.name.toLowerCase()}s with pagination` }
      ];

      for (const { op, inputs, outputs, outputsArray, description } of operations) {
        const tableName = entity.name.toLowerCase() + 's';
        const toolContext = {
          ...baseContext,
          entity,
          operation: op,
          inputs,
          outputs,
          outputsArray,
          description,
          tableName,
          insertFields: this.getInsertFields(entity),
          insertPlaceholders: this.getInsertPlaceholders(entity),
          insertValues: this.getInsertValues(entity)
        };

        const filename = op === 'list' ? `${op}-${entity.name.toLowerCase()}s.ts` : `${op}-${entity.name.toLowerCase()}.ts`;
        await this.templates.renderToFile(
          'tool.ts.ejs',
          toolContext,
          join(outputDir, 'generated/mcp-tools', filename)
        );
      }
    }

    // 6. Generate handlers (type-safe registry)
    await this.templates.renderToFile(
      'handlers.ts.ejs',
      baseContext,
      join(outputDir, 'generated/handlers.ts')
    );

    // 7. Generate UI resource
    await this.templates.renderToFile(
      'resource.ts.ejs',
      baseContext,
      join(outputDir, 'generated/resources/dashboard.ts')
    );

    // 8. Generate migrations
    for (const entity of contract.entities) {
      const tableName = entity.name.toLowerCase() + 's';
      await this.templates.renderToFile(
        'migration.sql.ejs',
        { ...baseContext, entity, tableName },
        join(outputDir, 'migrations', `001_create_${tableName}.sql`)
      );
    }

    // 9. Generate main index
    await this.templates.renderToFile(
      'index.ts.ejs',
      baseContext, 
      join(outputDir, 'index.ts')
    );

    // 10. Generate package.json
    await this.generatePackageJson(contract, outputDir);
    
    // 11. Generate tsconfig.json
    await this.generateTsConfig(outputDir);
    
    // 12. Generate E2E test
    await this.templates.renderToFile(
      'test-e2e.mjs.ejs',
      baseContext,
      join(outputDir, 'test-e2e.mjs')
    );
    
    // 13. Generate README
    await this.templates.renderToFile(
      'README.md.ejs',
      baseContext,
      join(outputDir, 'README.md')
    );
    
    // 14. Generate DB schema validator
    await this.templates.renderToFile(
      'db-schema-validator.ts.ejs',
      baseContext,
      join(outputDir, 'scripts/db-schema-validator.ts')
    );
  }

  private getInsertFields(entity: Entity): string[] {
    return entity.fields
      .filter(f => f.type !== 'uuid' && f.type !== 'datetime')
      .map(f => f.name);
  }

  private getInsertPlaceholders(entity: Entity): string[] {
    const fields = this.getInsertFields(entity);
    return fields.map((_, i) => `$${i + 1}`);
  }

  private getInsertValues(entity: Entity): string[] {
    return entity.fields
      .filter(f => f.type !== 'uuid' && f.type !== 'datetime')
      .map(f => `storageData.${f.name}`);
  }

  private async generatePackageJson(contract: Contract, outputDir: string): Promise<void> {
    const packageJson = {
      name: contract.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      description: contract.description || `Generated MCP tool: ${contract.name}`,
      type: 'module',
      main: 'dist/index.js',
      scripts: {
        build: 'tsc',
        start: 'node dist/index.js',
        dev: 'tsc --watch',
        test: 'node --test tests/*.test.js',
        'db:migrate': 'node scripts/migrate.js',
        'db:setup': 'npm run db:migrate',
        'db:validate': 'npx tsx scripts/db-schema-validator.ts'
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
        'typescript': '^5.0.0',
        'tsx': '^4.0.0'
      }
    };

    await fs.writeFile(
      join(outputDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  private async generateTsConfig(outputDir: string): Promise<void> {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        outDir: './dist',
        rootDir: '.',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        allowSyntheticDefaultImports: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true
      },
      include: ['**/*.ts'],
      exclude: ['node_modules', 'dist']
    };
    
    await fs.writeFile(
      join(outputDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
  }
}