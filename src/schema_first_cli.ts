#!/usr/bin/env node
/**
 * Schema-First MCP Tool Builder CLI
 * Usage: node dist/schema_first_cli.js generate-v2 <name> --output <dir> [--validate-ts]
 */

import { Command } from 'commander';
import { join, resolve } from 'path';
import { SchemaFirstGenerator } from './core/generate/emit.js';
import { ContractLoader } from './injector/load.js';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const program = new Command();

program
  .name('mcp-schema-builder')
  .description('Schema-first MCP tool builder with enforced type adapters')
  .version('2.0.0');

program
  .command('generate-v2')
  .description('Generate MCP tools from contract schema')
  .argument('<name>', 'Project name (used to find contracts/<name>.schema.json)')
  .option('-o, --output <dir>', 'Output directory', './generated_project')
  .option('--validate-ts', 'Run TypeScript validation after generation', false)
  .option('--validate-db', 'Run database schema validation after generation', false)
  .option('--contracts-dir <dir>', 'Contracts directory', './contracts')
  .action(async (name: string, options) => {
    try {
      console.log(`🚀 Generating MCP tools for: ${name}`);
      console.log(`📁 Output directory: ${resolve(options.output)}`);
      
      // Load contract
      const contractPath = join(options.contractsDir, `${name.toLowerCase()}.schema.json`);
      console.log(`📄 Loading contract: ${contractPath}`);
      
      const loader = new ContractLoader();
      const contract = await loader.load(contractPath);
      
      console.log(`✅ Loaded contract: ${contract.name}`);
      console.log(`📊 Entities: ${contract.entities.map((e: any) => e.name).join(', ')}`);
      
      // Generate
      const currentDir = new URL(import.meta.url).pathname;
      const templatesDir = resolve(currentDir, '../../src/templates');
      const generator = new SchemaFirstGenerator(templatesDir);
      
      console.log(`🔨 Generating files to: ${options.output}`);
      await generator.generate(contract, options.output);
      
      console.log('✅ Generated files:');
      console.log('  📦 package.json');
      console.log('  🏗️  index.ts (MCP server)');
      console.log('  📋 schemas/ (Zod definitions)');  
      console.log('  🔄 adapters/ (Type converters)');
      console.log('  🔧 mcp-tools/ (CRUD operations)');
      console.log('  🖥️  resources/dashboard.ts (UI)');
      console.log('  🗃️  migrations/ (SQL)');
      
      // TypeScript validation
      if (options.validateTs) {
        console.log('🔍 Running TypeScript validation...');
        try {
          await execAsync('npm install', { cwd: options.output });
          const { stdout, stderr } = await execAsync('npx tsc --noEmit', { cwd: options.output });
          
          if (stderr) {
            console.warn('⚠️  TypeScript warnings:', stderr);
          } else {
            console.log('✅ TypeScript validation passed');
          }
        } catch (error: any) {
          console.error('❌ TypeScript validation failed:');
          console.error(error.stdout || error.message);
          process.exit(1);
        }
      }
      
      // Database schema validation
      if (options.validateDb) {
        console.log('🔍 Running database schema validation...');
        try {
          await execAsync('npm install', { cwd: options.output });
          
          const databaseUrl = process.env.DATABASE_URL;
          if (!databaseUrl) {
            console.warn('⚠️  DATABASE_URL not set, skipping DB validation');
          } else {
            const { stdout, stderr } = await execAsync(
              `npx tsx scripts/db-schema-validator.ts "${databaseUrl}" "${contractPath}"`, 
              { cwd: options.output }
            );
            
            if (stderr && !stderr.includes('Warning')) {
              console.warn('⚠️  DB validation warnings:', stderr);
            }
            console.log(stdout);
          }
        } catch (error: any) {
          console.error('❌ Database validation failed:');
          console.error(error.stdout || error.message);
          console.log('💡 Make sure DATABASE_URL is set and database is running');
          process.exit(1);
        }
      }
      
      console.log('\n🎉 Generation complete!');
      console.log('\nNext steps:');
      console.log(`1. cd ${options.output}`);
      console.log('2. npm install');
      console.log('3. Set DATABASE_URL in .env');
      console.log('4. npm run db:migrate');
      console.log('5. npm run build && npm start');
      
    } catch (error: any) {
      console.error('❌ Generation failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('create-contract')
  .description('Create a sample contract schema')
  .argument('<name>', 'Contract name')
  .option('-o, --output <dir>', 'Output directory', './contracts')
  .action(async (name: string, options) => {
    const contractPath = join(options.output, `${name.toLowerCase()}.schema.json`);
    
    // Sample customer management contract
    const sampleContract = {
      name: name,
      description: `${name} management system`,
      entities: [
        {
          name: 'Customer',
          description: 'Customer entity with basic information',
          fields: [
            { name: 'name', type: 'string', nullable: false, description: 'Customer full name' },
            { name: 'email', type: 'email', nullable: false, description: 'Customer email address' },
            { name: 'phone', type: 'string', nullable: true, description: 'Customer phone number' },
            { name: 'status', type: 'string', nullable: false, description: 'Customer status (active/inactive)' }
          ]
        }
      ]
    };
    
    await fs.mkdir(options.output, { recursive: true });
    await fs.writeFile(contractPath, JSON.stringify(sampleContract, null, 2));
    
    console.log(`✅ Created contract: ${contractPath}`);
    console.log('📝 Edit the contract and run generate-v2 to create your MCP tools');
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };