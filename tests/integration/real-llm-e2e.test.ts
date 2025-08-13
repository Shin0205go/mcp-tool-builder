/**
 * Real LLM End-to-End Test
 * 
 * 実際のLLMを使用してMCPツールを生成し、動作確認まで行う統合テスト
 * ANTHROPIC_API_KEYが設定されている場合のみ実行される
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import dotenv from 'dotenv';

import { LLMBasedSpecGenerator } from '../../src/schema_first/llm_based.js';
import { IntegratedToolGenerator } from '../../src/schema_first/integrated_tool_generator.js';

// Load environment variables from .env file
dotenv.config();

const execAsync = promisify(exec);

test('Real LLM E2E - Generate customer management tool', async () => {
  // API キーチェック
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  Skipping real LLM test - ANTHROPIC_API_KEY not set');
    console.log('   To run this test: export ANTHROPIC_API_KEY=your_api_key');
    return;
  }

  console.log('🚀 Starting real LLM generation test...');
  
  const testDir = join(tmpdir(), 'llm-e2e-test-' + Date.now());
  const testPrompt = 'Create a simple customer management system with basic CRUD operations';
  
  try {
    // 1. テスト用ディレクトリ作成
    await mkdir(testDir, { recursive: true });
    console.log(`📁 Test directory: ${testDir}`);

    // 2. LLMを使ってツール仕様生成
    console.log('🤖 Calling LLM to generate tool specification...');
    const specGenerator = new LLMBasedSpecGenerator();
    
    const startTime = Date.now();
    const toolSpec = await specGenerator.generateFromPrompt(testPrompt);
    const llmDuration = Date.now() - startTime;
    
    console.log(`✅ LLM generation completed in ${llmDuration}ms`);
    console.log(`   Generated tool: ${toolSpec.name}`);
    console.log(`   Entities: ${toolSpec.entities.map(e => e.name).join(', ')}`);
    console.log(`   Operations: ${toolSpec.operations.map(o => o.name).join(', ')}`);
    
    // 🔍 バグ調査: 生成された仕様の詳細を表示
    console.log(`🔍 Debug - Operation descriptions:`);
    toolSpec.operations.forEach((op: any, i: number) => {
      console.log(`   ${i + 1}. ${op.name}: "${op.description}"`);
      if (op.description && op.description.includes("'")) {
        console.log(`   ⚠️  Contains single quote - potential template issue!`);
      }
    });

    // 3. 生成された仕様の基本検証
    assert(toolSpec.name && toolSpec.name.length > 0, 'Tool should have a name');
    assert(toolSpec.description && toolSpec.description.length > 0, 'Tool should have a description');
    assert(toolSpec.entities && toolSpec.entities.length > 0, 'Tool should have at least one entity');
    assert(toolSpec.operations && toolSpec.operations.length > 0, 'Tool should have at least one operation');
    
    // Customer関連のエンティティまたは操作があるか確認
    const hasCustomerEntity = toolSpec.entities.some(e => 
      e.name.toLowerCase().includes('customer') || e.name.toLowerCase().includes('client'));
    const hasCustomerOperation = toolSpec.operations.some(o => 
      o.name.toLowerCase().includes('customer') || o.name.toLowerCase().includes('client'));
    
    assert(hasCustomerEntity || hasCustomerOperation, 
           'Tool should contain customer-related entities or operations');

    console.log('✅ Generated specification validated');

    // 4. MCPツール生成
    console.log('🔨 Generating MCP tool from specification...');
    const generator = new IntegratedToolGenerator();
    
    const normalizedToolName = toolSpec.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const generationOptions = {
      outputDir: testDir,
      toolName: normalizedToolName,
      withUI: false, // UIなしでシンプルに
      origin: 'http://localhost:3000',
      theme: 'default' as const,
      enableRealtime: false,
      enableExport: false,
      allowedTools: toolSpec.operations.map(op => op.name)
    };

    const generationStartTime = Date.now();
    await generator.generateIntegratedTool(toolSpec, generationOptions);
    const generationDuration = Date.now() - generationStartTime;

    console.log(`✅ Tool generation completed in ${generationDuration}ms`);

    // 5. 生成されたファイル構造を検証
    const packageJsonPath = join(testDir, 'package.json');
    const indexTsPath = join(testDir, 'index.ts');
    
    assert(await fileExists(packageJsonPath), 'package.json should exist');
    assert(await fileExists(indexTsPath), 'index.ts should exist');
    
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    // Package.json name uses kebab-case, toolName uses snake_case
    const expectedPackageName = normalizedToolName.replace(/_/g, '-');
    assert(packageJson.name === expectedPackageName, 
           `Package name should match expected format. Got: ${packageJson.name}, Expected: ${expectedPackageName}`);
    assert(packageJson.dependencies['@modelcontextprotocol/sdk'], 'Should have MCP SDK dependency');
    assert(packageJson.dependencies['zod'], 'Should have Zod dependency');

    console.log('✅ Generated file structure validated');

    // 6. TypeScript依存関係インストール
    console.log('📦 Installing dependencies...');
    const installStartTime = Date.now();
    await execAsync('npm install', { cwd: testDir, timeout: 120000 }); // 2分タイムアウト
    const installDuration = Date.now() - installStartTime;
    console.log(`✅ Dependencies installed in ${installDuration}ms`);

    // 7. TypeScript ビルド
    console.log('🔨 Building TypeScript...');
    const buildStartTime = Date.now();
    let buildDuration = 0;
    try {
      const { stdout, stderr } = await execAsync('npm run build', { cwd: testDir, timeout: 60000 }); // 1分タイムアウト
      buildDuration = Date.now() - buildStartTime;
      console.log(`✅ TypeScript build completed in ${buildDuration}ms`);
      if (stderr && stderr.trim()) {
        console.log(`   Build warnings: ${stderr.trim()}`);
      }
    } catch (buildError: any) {
      buildDuration = Date.now() - buildStartTime;
      console.error(`❌ TypeScript build failed after ${buildDuration}ms:`);
      console.error(`   Exit code: ${buildError.code}`);
      console.error(`   Stdout: ${buildError.stdout || 'No stdout'}`);
      console.error(`   Stderr: ${buildError.stderr || 'No stderr'}`);
      throw new Error(`Build failed: ${buildError.stderr || buildError.stdout || buildError.message}`);
    }

    // 8. 生成されたJavaScriptファイルを確認
    const indexJsPath = join(testDir, 'index.js');
    assert(await fileExists(indexJsPath), 'Compiled index.js should exist');
    
    const indexJsContent = await readFile(indexJsPath, 'utf-8');
    assert(indexJsContent.includes('Server'), 'Should contain MCP Server code');
    assert(indexJsContent.includes('tools'), 'Should contain tools handling');

    console.log('✅ Compiled JavaScript validated');

    // 9. MCPサーバー動作テスト
    console.log('🧪 Testing MCP server functionality...');
    await testGeneratedMcpServer(testDir, toolSpec);

    // 10. 成功レポート
    const totalTime = Date.now() - startTime;
    console.log('\n🎉 Real LLM E2E Test PASSED!');
    console.log('📊 Performance Summary:');
    console.log(`   LLM Generation: ${llmDuration}ms`);
    console.log(`   Code Generation: ${generationDuration}ms`);
    console.log(`   Dependencies: ${installDuration}ms`);
    console.log(`   Build: ${buildDuration}ms`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Generated Tool: ${toolSpec.name}`);
    console.log(`   Tool Path: ${testDir}`);

  } catch (testError: any) {
    // テスト失敗時はファイルを保持してデバッグ情報表示
    console.error(`\n❌ E2E Test failed: ${testError.message}`);
    console.error(`🔍 Debug information:`);
    console.error(`   Generated files preserved at: ${testDir}`);
    console.error(`   Inspect the generated code to debug template issues`);
    throw testError;
  } finally {
    // テスト成功時のみクリーンアップ
    // 失敗時はファイルを保持してデバッグ可能にする
    if (process.env.KEEP_TEST_FILES !== 'true') {
      try {
        // Note: この時点でテストが成功しているのでクリーンアップを実行
        // 失敗時はcatchブロックでthrowされるためここに到達しない
        await rm(testDir, { recursive: true, force: true });
        console.log('🧹 Test directory cleaned up');
      } catch (error) {
        console.warn(`⚠️  Cleanup failed: ${error}`);
      }
    } else {
      console.log(`📁 Test files preserved at: ${testDir}`);
    }
  }
});

/**
 * 生成されたMCPサーバーの動作テスト
 */
async function testGeneratedMcpServer(toolDir: string, toolSpec: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('MCP server test timed out after 30 seconds'));
    }, 30000);

    console.log('   Starting MCP server process...');
    const serverProcess = spawn('node', ['index.js'], {
      cwd: toolDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // テスト用のダミーDB接続文字列
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db'
      }
    });

    let stdout = '';
    let stderr = '';
    let testCompleted = false;

    serverProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    serverProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
      
      // サーバー起動の確認
      if (!testCompleted && (stderr.includes('MCP Server') || stderr.includes('running'))) {
        console.log('   ✅ MCP server started');
        testCompleted = true;
        
        // tools/list リクエストのテスト
        testToolsListRequest(serverProcess, toolSpec)
          .then(() => {
            clearTimeout(timeout);
            serverProcess.kill('SIGTERM');
            setTimeout(() => serverProcess.kill('SIGKILL'), 2000); // 2秒後に強制終了
            resolve();
          })
          .catch((error) => {
            clearTimeout(timeout);
            serverProcess.kill('SIGKILL');
            reject(error);
          });
      }
    });

    serverProcess.on('error', (error) => {
      if (!testCompleted) {
        clearTimeout(timeout);
        reject(new Error(`Server process error: ${error.message}`));
      }
    });

    serverProcess.on('exit', (code, signal) => {
      if (!testCompleted && code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
        clearTimeout(timeout);
        reject(new Error(`Server exited unexpectedly (code: ${code}, signal: ${signal})\nStderr: ${stderr}`));
      }
    });
  });
}

/**
 * tools/list リクエストのテスト
 */
async function testToolsListRequest(serverProcess: any, toolSpec: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: 'test-tools-list',
      method: 'tools/list',
      params: {}
    };

    console.log('   Sending tools/list request...');
    serverProcess.stdin?.write(JSON.stringify(request) + '\n');

    let responseBuffer = '';
    const responseTimeout = setTimeout(() => {
      reject(new Error('tools/list request timed out'));
    }, 10000);

    const onData = (data: Buffer) => {
      responseBuffer += data.toString();
      
      // JSON レスポンスのパース試行
      const lines = responseBuffer.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          
          if (response.id === 'test-tools-list') {
            clearTimeout(responseTimeout);
            serverProcess.stdout?.off('data', onData);
            
            // レスポンス検証
            assert(response.result, 'Response should have result');
            assert(response.result.tools, 'Result should have tools array');
            assert(Array.isArray(response.result.tools), 'Tools should be array');
            assert(response.result.tools.length > 0, 'Should have at least one tool');
            
            // 期待されるツールの存在確認
            const toolNames = response.result.tools.map((t: any) => t.name);
            const expectedOperations = toolSpec.operations.map((op: any) => op.name);
            
            // 少なくとも1つの期待されるツールが存在するか確認
            const hasExpectedTool = expectedOperations.some((expected: string) => 
              toolNames.some((actual: string) => actual.includes(expected) || expected.includes(actual))
            );
            
            assert(hasExpectedTool, 
                   `Should have at least one expected tool. Found: ${toolNames.join(', ')}, Expected: ${expectedOperations.join(', ')}`);
            
            console.log(`   ✅ tools/list validated (${toolNames.length} tools found)`);
            resolve();
            return;
          }
        } catch (parseError) {
          // JSON パースエラーは無視（部分的なレスポンスの可能性）
          continue;
        }
      }
    };

    serverProcess.stdout?.on('data', onData);
  });
}

/**
 * ファイル存在チェックのヘルパー
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

test('API key validation test', async () => {
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('✅ ANTHROPIC_API_KEY is configured');
    
    // API キーの基本的な形式チェック
    const apiKey = process.env.ANTHROPIC_API_KEY;
    assert(typeof apiKey === 'string', 'API key should be string');
    assert(apiKey.length > 10, 'API key should be reasonably long');
    
    console.log('✅ API key basic validation passed');
  } else {
    console.log('ℹ️  ANTHROPIC_API_KEY not set - real LLM tests will be skipped');
  }
});

console.log('🧪 Real LLM E2E Tests loaded');