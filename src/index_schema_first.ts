#!/usr/bin/env node

import { Command } from 'commander';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import dotenv from 'dotenv';

import { LLMBasedSpecGenerator } from './schema_first/llm_based.js';
import { IntegratedToolGenerator, type IntegratedGenerationOptions } from './schema_first/integrated_tool_generator.js';
import { 
  createLLMInTheLoopGenerator, 
  LLMInTheLoopOptions 
} from './schema_first/llm_in_the_loop_generator.js';
import { createAnthropicLLMAdapter } from './schema_first/anthropic_llm_adapter.js';
import { configManager } from './core/config/builder_config.js';
import { templatePackRegistry } from './core/template_packs/base.js';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';

// Load environment variables
dotenv.config();

/**
 * Show detailed system status and diagnostics
 */
async function showSystemStatus(options: any) {
  console.log('🔧 MCP Tool Builder - System Status\n');

  // Check Node.js version
  console.log('📦 Runtime Environment:');
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Platform: ${process.platform} ${process.arch}`);
  console.log(`   Working Directory: ${process.cwd()}`);
  
  // Check package.json info
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      console.log(`   MCP Tool Builder: ${packageJson.version}`);
    }
  } catch (error) {
    console.log('   MCP Tool Builder: version unknown');
  }
  
  console.log('');
  
  // Check environment variables
  console.log('🔐 Environment Configuration:');
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ configured' : '❌ missing'}`);
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ configured' : '❌ missing'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DEBUG: ${process.env.DEBUG || 'false'}`);
  console.log('');
  
  // Check configuration file
  console.log('⚙️  Configuration Status:');
  try {
    const configPath = options.config;
    if (existsSync(configPath)) {
      console.log(`   Config file: ✅ ${configPath}`);
      const config = await configManager.load(configPath);
      console.log(`   Project name: ${config.name}`);
      console.log(`   Preset: ${config.preset || 'custom'}`);
      console.log(`   Storage provider: ${config.providers.storage}`);
      console.log(`   UI enabled: ${config.ui.enabled ? '✅' : '❌'}`);
      
      // Check for consistency warnings
      const warnings = configManager.validateConsistency(config);
      if (warnings.length > 0) {
        console.log('   ⚠️  Configuration warnings:');
        warnings.forEach(warning => console.log(`      - ${warning}`));
      }
    } else {
      console.log(`   Config file: ❌ not found (${configPath})`);
      console.log('   Use: npm run config:init to create one');
    }
  } catch (error: any) {
    console.log(`   Config file: ❌ invalid (${error.message})`);
  }
  console.log('');
  
  // Check template packs
  console.log('📦 Template Packs:');
  const packs = templatePackRegistry.list();
  if (packs.length > 0) {
    packs.forEach(pack => {
      console.log(`   ✅ ${pack.name} v${pack.version} - ${pack.description}`);
    });
  } else {
    console.log('   ⚠️  No template packs registered');
  }
  console.log('');
  
  // Check generated projects
  console.log('🏗️  Generated Projects:');
  const generatedDir = join(process.cwd(), 'generated');
  if (existsSync(generatedDir)) {
    try {
      const projects = await fs.readdir(generatedDir, { withFileTypes: true });
      const directories = projects.filter(p => p.isDirectory());
      if (directories.length > 0) {
        console.log(`   Found ${directories.length} generated projects:`);
        for (const dir of directories.slice(0, 5)) { // Show max 5
          console.log(`   📁 ${dir.name}`);
          // Check if project has package.json
          const projectPackageJson = join(generatedDir, dir.name, 'package.json');
          if (existsSync(projectPackageJson)) {
            try {
              const pkgJson = JSON.parse(await fs.readFile(projectPackageJson, 'utf-8'));
              console.log(`      ${pkgJson.description || 'No description'}`);
            } catch (error) {
              console.log(`      (invalid package.json)`);
            }
          }
        }
        if (directories.length > 5) {
          console.log(`   ... and ${directories.length - 5} more`);
        }
      } else {
        console.log('   No generated projects found');
      }
    } catch (error) {
      console.log('   ❌ Cannot read generated directory');
    }
  } else {
    console.log('   No generated projects directory');
  }
  console.log('');
  
  // Check system capabilities
  console.log('🔧 System Capabilities:');
  
  // Check if TypeScript is available
  try {
    const { spawn } = await import('child_process');
    const tscCheck = spawn('tsc', ['--version'], { stdio: 'pipe' });
    let tscVersion = '';
    tscCheck.stdout?.on('data', (data) => {
      tscVersion += data.toString();
    });
    
    tscCheck.on('close', (code) => {
      if (code === 0) {
        console.log(`   TypeScript: ✅ ${tscVersion.trim()}`);
      } else {
        console.log('   TypeScript: ❌ not available in PATH');
      }
    });
    
    // Give it a moment to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.log('   TypeScript: ❌ not available');
  }
  
  // Check if Docker is available
  try {
    const { spawn } = await import('child_process');
    const dockerCheck = spawn('docker', ['--version'], { stdio: 'pipe' });
    let dockerVersion = '';
    dockerCheck.stdout?.on('data', (data) => {
      dockerVersion += data.toString();
    });
    
    dockerCheck.on('close', (code) => {
      if (code === 0) {
        console.log(`   Docker: ✅ ${dockerVersion.trim()}`);
      } else {
        console.log('   Docker: ❌ not available');
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.log('   Docker: ❌ not available');
  }
  
  console.log('');
  
  // System health summary
  console.log('🏥 System Health Summary:');
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasConfigFile = existsSync(options.config);
  
  if (hasAnthropicKey && hasConfigFile) {
    console.log('   ✅ System ready for generation');
  } else {
    console.log('   ⚠️  System needs attention:');
    if (!hasAnthropicKey) {
      console.log('      - Set ANTHROPIC_API_KEY environment variable');
    }
    if (!hasConfigFile) {
      console.log('      - Create configuration file with: npm run config:init');
    }
  }
  
  console.log('');
  console.log('🚀 Quick Start Commands:');
  console.log('   npm run generate:ui "Your tool description"');
  console.log('   npm run config:init --preset crm');
  console.log('   npm run config:validate --production');
}

const program = new Command();

program
  .name('mcp-tool-builder-ui')
  .description('MCP Tool Builder with UI - Schema-first approach')
  .version('2.0.0');

program
  .command('generate')
  .description('Generate MCP tool with optional UI components')
  .argument('<prompt>', 'Natural language description of the tool')
  .option('--output-dir <dir>', 'Output directory', './generated')
  .option('--with-ui', 'Generate UI components', false)
  .option('--ui-origin <origin>', 'UI origin for postMessage (required with --with-ui)')
  .option('--ui-theme <theme>', 'UI theme (default|minimal|bootstrap)', 'default')
  .option('--enable-realtime', 'Enable real-time updates', false)
  .option('--enable-export', 'Enable data export features', false)
  .option('--allowed-tools <tools...>', 'Allowed tools for UI (comma-separated)')
  .action(async (prompt: string, options) => {
    try {
      console.log('🚀 MCP Tool Builder with UI - Schema-first Edition\n');
      
      // Parse options
      const withUI = options.withUi;
      const outputDir = join(process.cwd(), options.outputDir);
      
      // Validate UI options
      if (withUI && !options.uiOrigin) {
        console.error('❌ Error: --ui-origin is required when using --with-ui');
        console.error('   Example: --ui-origin=http://localhost:5173');
        process.exit(1);
      }
      
      // Generate tool specification
      console.log('🔍 Analyzing prompt...');
      const specGenerator = new LLMBasedSpecGenerator();
      const toolSpec = await specGenerator.generateFromPrompt(prompt);
      
      const toolName = toolSpec.name || 'generated_tool';
      const fullOutputDir = join(outputDir, toolName);
      
      console.log(`✅ Tool specification created: ${toolName}`);
      console.log(`   Entities: ${toolSpec.entities.map(e => e.name).join(', ')}`);
      console.log(`   Operations: ${toolSpec.operations.map(o => o.name).join(', ')}`);
      
      if (withUI) {
        console.log(`   UI Components: Forms, Lists, Dashboard${options.enableExport ? ', Export' : ''}`);
      }
      
      // Create output directory
      await mkdir(fullOutputDir, { recursive: true });
      
      // Prepare generation options
      const generationOptions: IntegratedGenerationOptions = {
        outputDir: fullOutputDir,
        toolName: toolName,
        withUI: withUI,
        origin: options.uiOrigin || 'http://localhost:3000',
        theme: options.uiTheme as 'default' | 'minimal' | 'bootstrap',
        enableRealtime: options.enableRealtime,
        enableExport: options.enableExport,
        allowedTools: options.allowedTools || toolSpec.operations.map(op => op.name)
      };
      
      // Generate integrated tool
      console.log(`🔨 Generating ${withUI ? 'tool with UI components' : 'MCP tool'}...`);
      const generator = new IntegratedToolGenerator();
      const result = await generator.generateIntegratedTool(toolSpec, generationOptions);
      
      console.log('✅ Generation complete!\n');
      
      // Print architecture info
      console.log('📐 Architecture:');
      if (withUI) {
        console.log('   UI Components (Schema-generated)');
        console.log('       ↓ (Safe postMessage)');
        console.log('   UI-Tool Broker (Origin-verified)');
        console.log('       ↓ (Idempotent calls)');
      }
      console.log('   MCP Tools (Type-safe)');
      console.log('       ↓');
      console.log('   Business Logic (Pure functions)');
      console.log('       ↓');
      console.log('   DAO Layer (Zod-validated)');
      console.log('       ↓');
      console.log('   PostgreSQL Database\n');
      
      // Print usage instructions
      if (withUI) {
        console.log('🎨 UI Features:');
        console.log(`   • Origin-safe communication: ${options.uiOrigin}`);
        console.log('   • Automatic form generation from schemas');
        console.log('   • Idempotent operations with request deduplication');
        console.log('   • Real-time updates via job system');
        console.log('   • Type-safe client-server communication\n');
      }
      
      console.log('📁 Generated Structure:');
      console.log(`${fullOutputDir}/`);
      console.log('├── schemas/           # Single source of truth (Zod)');
      console.log('├── mcp-tools/         # MCP tool definitions');
      console.log('├── business-logic/    # Pure business functions');
      console.log('├── dao/               # Database access layer');
      if (withUI) {
        console.log('├── ui-resources/      # Generated UI components');
        console.log('├── integration/       # UI-Tool broker setup');
      }
      console.log('├── migrations/        # Database migrations');
      console.log('├── scripts/           # Development scripts');
      console.log('└── docker-compose.yml # Production deployment\n');
      
      // Print next steps
      console.log('🚀 Next Steps:');
      console.log(`1. cd ${result}`);
      console.log('2. npm install');
      console.log('3. cp .env.example .env');
      console.log('4. Edit .env with your database credentials');
      console.log('5. npm run db:migrate');
      console.log('6. npm run build && npm start\n');
      
      if (withUI) {
        console.log('🌐 UI Access:');
        console.log('Add to your Claude Desktop MCP config:');
        console.log('{');
        console.log(`  "mcpServers": {`);
        console.log(`    "${toolName}": {`);
        console.log(`      "command": "node",`);
        console.log(`      "args": ["${join(result, 'index.js')}"]`);
        console.log(`    }`);
        console.log(`  }`);
        console.log(`}\n`);
        
        console.log('Then use UI resources:');
        toolSpec.entities.forEach(entity => {
          const entityLower = entity.name.toLowerCase();
          console.log(`  • ui://${entityLower}/create-form`);
          console.log(`  • ui://${entityLower}/list-view`);
        });
        console.log('');
      }
      
      console.log('🐳 Docker Deployment:');
      console.log(`1. cd ${result}`);
      console.log('2. docker-compose up -d');
      console.log('3. docker-compose exec app npm run db:migrate\n');
      
      console.log(`✨ Success! Your ${withUI ? 'UI-enabled ' : ''}MCP tool has been generated.`);
      console.log(`📍 Location: ${result}`);
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    }
  });

// New LLM-in-the-Loop command (v2)
program
  .command('generate-v2')
  .description('Generate MCP tool using LLM-in-the-Loop approach (fixed templates)')
  .argument('<prompt>', 'Description of the tool to generate')
  .option('--output-dir <dir>', 'Output directory', './generated')
  .option('--with-ui', 'Generate UI components', false)
  .option('--ui-origin <origin>', 'UI origin for postMessage (required with --with-ui)')
  .option('--max-retries <number>', 'Max LLM retries', '3')
  .option('--no-validate-ts', 'Skip TypeScript validation (faster but less safe)', false)
  .action(async (prompt: string, options: any) => {
    try {
      console.log('🚀 MCP Tool Builder - LLM-in-the-Loop (v2)\n');
      
      // Validate UI options
      const withUI = options.withUi;
      const maxRetries = parseInt(options.maxRetries) || 3;
      
      if (withUI && !options.uiOrigin) {
        console.error('❌ Error: --ui-origin is required when using --with-ui');
        process.exit(1);
      }
      
      // Create output directory - sanitize project name  
      const sanitizedName = prompt
        .replace(/[^\w\s]/g, '') // Remove special chars
        .split(/\s+/)           // Split on whitespace
        .filter(word => word.length > 0)
        .map(word => word.toLowerCase())
        .join('_') || 'generated_project';
      
      const outputDir = join(options.outputDir, sanitizedName);
      await mkdir(outputDir, { recursive: true });
      
      // Initialize LLM-in-the-Loop generator
      const llmGenerator = new LLMBasedSpecGenerator();
      const llmAdapter = createAnthropicLLMAdapter(llmGenerator);
      const generator = createLLMInTheLoopGenerator(llmAdapter);
      
      const llmOptions: LLMInTheLoopOptions = {
        outputDir,
        withUI: withUI,
        uiOrigin: options.uiOrigin,
        maxRetries,
        validateTypeScript: !options.noValidateTs  // 既定ON、--no-validate-tsでOFF
      };
      
      // Generate using LLM-in-the-Loop
      await generator.generate(prompt, llmOptions);
      
      console.log('📁 Generated Structure:');
      console.log(`${outputDir}/`);
      console.log('├── schemas/           # Zod schemas (normalized)');
      console.log('├── mcp-tools/         # MCP tools (fixed ABI)');
      console.log('├── business-logic/    # Business logic (fixed signatures)');  
      console.log('├── dao/              # Data access (sanitized inputs)');
      if (withUI) {
        console.log('├── integration/      # UI-Tool broker');
        console.log('├── mcp-ui-server/    # UI MCP server');
        console.log('├── host/            # Host embed helper');
      }
      console.log('└── package.json      # Dependencies');
      
      console.log('\n🚀 Next Steps:');
      console.log(`1. cd ${outputDir}`);
      console.log('2. npm install');
      console.log('3. npm run build');
      console.log('4. npm start');
      
      if (withUI) {
        console.log('\n🌐 UI Integration:');
        console.log(`• Origin: ${options.uiOrigin}`);
        console.log('• Fixed ABI with type safety');
        console.log('• Automatic input sanitization');
        console.log('• Error-free template generation');
      }
      
      console.log(`\n✨ Success! LLM-in-the-Loop generation complete.`);
      console.log(`📍 Location: ${outputDir}`);
      
    } catch (error) {
      console.error('❌ LLM-in-the-Loop generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show information about schema-first approach and system status')
  .option('--system', 'Show detailed system status and diagnostics')
  .option('--config [path]', 'Show configuration information', './builder.config.yaml')
  .action(async (options: any) => {
    if (options.system) {
      await showSystemStatus(options);
      return;
    }
    console.log('🚀 MCP Tool Builder - Schema-first Approach\n');
    
    console.log('🎯 Key Benefits:');
    console.log('  ✅ Contract-first: No schema drift between UI and API');
    console.log('  ✅ Type Safety: Full TypeScript support from schemas');
    console.log('  ✅ Security: Origin-verified postMessage communication');
    console.log('  ✅ Reliability: Idempotent operations with request deduplication');
    console.log('  ✅ Performance: Optimized for long-running jobs');
    console.log('  ✅ Maintainability: Single source of truth for all interfaces\n');
    
    console.log('🏗️  Architecture Layers:');
    console.log('  1. Zod Schemas (Single Source of Truth)');
    console.log('     ↓ generates ↓');
    console.log('  2. TypeScript Types + JSON Schema + UI Forms');
    console.log('     ↓ powers ↓');
    console.log('  3. MCP Tools + Business Logic + UI Components');
    console.log('     ↓ secured by ↓');
    console.log('  4. UI-Tool Broker (Origin verification + Idempotency)');
    console.log('     ↓ persists via ↓');
    console.log('  5. DAO Layer + PostgreSQL\n');
    
    console.log('🔒 Security Features:');
    console.log('  • Origin verification for postMessage');
    console.log('  • Allowlist-based tool access control');
    console.log('  • Request ID-based idempotency');
    console.log('  • Content Security Policy friendly');
    console.log('  • No inline script execution\n');
    
    console.log('📊 Generated UI Components:');
    console.log('  • Create Forms (with validation)');
    console.log('  • Edit Forms (with pre-population)');
    console.log('  • List Views (with filtering/sorting)');
    console.log('  • Detail Views (read-only display)');
    console.log('  • Search Interfaces (full-text search)');
    console.log('  • Dashboards (with charts and KPIs)\n');
    
    console.log('🚀 Usage Examples:');
    console.log('  # Generate MCP tool only');
    console.log('  mcp-tool-builder-ui generate "Customer management system"');
    console.log('');
    console.log('  # Generate with UI components');
    console.log('  mcp-tool-builder-ui generate "Task tracker with dashboard" --with-ui');
    console.log('');
    console.log('  # Full-featured generation');
    console.log('  mcp-tool-builder-ui generate "E-commerce order system" \\');
    console.log('    --with-ui \\');
    console.log('    --ui-origin https://myapp.com \\');
    console.log('    --enable-export \\');
    console.log('    --enable-realtime\n');
  });

// Error handling
program.configureOutput({
  outputError: (str, write) => {
    write(`❌ ${str}`);
  }
});

program.parse();