#!/usr/bin/env node
import { program } from 'commander';
import { configManager } from '../core/config/builder_config.js';
import * as fs from 'fs/promises';
import * as path from 'path';

program
  .name('validate-config')
  .description('Validate builder.config.yaml files')
  .version('1.0.0');

program
  .command('validate')
  .description('Validate a builder.config.yaml file')
  .argument('[config-path]', 'Path to config file', './builder.config.yaml')
  .option('--production', 'Use production validation (strict)')
  .option('--consistency', 'Check configuration consistency')
  .action(async (configPath: string, options: any) => {
    try {
      console.log(`🔍 Validating config: ${configPath}`);
      
      // Check if file exists
      try {
        await fs.access(configPath);
      } catch {
        console.error(`❌ Config file not found: ${configPath}`);
        process.exit(1);
      }

      // Load and validate configuration
      const config = await configManager.load(configPath);
      
      if (options.production) {
        console.log('📋 Running production validation...');
        configManager.validateProduction(config);
        console.log('✅ Production validation passed');
      } else {
        console.log('✅ Basic validation passed');
      }

      if (options.consistency) {
        console.log('🔧 Checking configuration consistency...');
        const warnings = configManager.validateConsistency(config);
        
        if (warnings.length > 0) {
          console.log('⚠️  Configuration warnings:');
          warnings.forEach(warning => console.log(`   - ${warning}`));
        } else {
          console.log('✅ No consistency issues found');
        }
      }

      // Display config summary
      console.log('\n📊 Configuration Summary:');
      console.log(`   Name: ${config.name}`);
      console.log(`   Preset: ${config.preset || 'custom'}`);
      console.log(`   Storage: ${config.providers.storage}`);
      console.log(`   UI: ${config.ui.enabled ? 'enabled' : 'disabled'}`);
      console.log(`   Features: ${Object.entries(config.generation.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature)
        .join(', ')}`);

    } catch (error: any) {
      console.error('❌ Validation failed:');
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command('create')
  .description('Create a new builder.config.yaml file')
  .argument('[path]', 'Output path', './builder.config.yaml')
  .option('--preset <preset>', 'Use preset configuration', 'custom')
  .option('--name <name>', 'Project name')
  .option('--description <description>', 'Project description')
  .action(async (outputPath: string, options: any) => {
    try {
      console.log(`🚀 Creating config file: ${outputPath}`);
      
      // Check if file already exists
      try {
        await fs.access(outputPath);
        console.log('⚠️  File already exists. Use --force to overwrite.');
        process.exit(1);
      } catch {
        // File doesn't exist, which is what we want
      }

      const defaultConfig: any = {
        name: options.name || 'my-mcp-tool',
        description: options.description || 'Generated MCP tool',
        preset: options.preset,
        providers: {
          storage: 'postgres'
        },
        ui: {
          enabled: true,
          renderer: 'rawHtml',
          origin: 'https://localhost:3000'
        },
        generation: {
          templatePack: 'crud',
          language: 'typescript',
          target: 'docker'
        }
      };

      await configManager.save(defaultConfig, outputPath);
      console.log('✅ Configuration file created successfully');
      
    } catch (error: any) {
      console.error('❌ Failed to create config:');
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show information about configuration schema')
  .action(() => {
    console.log('📋 Builder Configuration Schema');
    console.log('');
    console.log('📁 Mandatory fields:');
    console.log('   - name: Project name (required for production)');
    console.log('');
    console.log('🔧 Available providers:');
    console.log('   Storage: postgres, mysql, mongodb, sqlite');
    console.log('   Queue: redis, sqs, pubsub, memory');
    console.log('   Auth: oauth, jwt, basic, api-key');
    console.log('   Payment: stripe, paypal, square');
    console.log('');
    console.log('🎨 Available presets:');
    console.log('   - crm: Customer relationship management');
    console.log('   - inventory: Inventory management system');
    console.log('   - booking: Booking and reservation system');
    console.log('   - support: Support ticketing system');
    console.log('   - cms: Content management system');
    console.log('   - ecommerce: E-commerce platform');
    console.log('   - custom: Custom configuration');
    console.log('');
    console.log('🛡️ Security features:');
    console.log('   - RBAC: Role-based access control');
    console.log('   - PII Masking: Sensitive data protection');
    console.log('   - Rate Limiting: Request throttling');
    console.log('   - Input Validation: Schema validation');
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}