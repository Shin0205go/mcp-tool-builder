/**
 * MCP Generation End-to-End Test
 *
 * 生成されたMCPツールが実際に動作することを確認する統合テスト
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { rm, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { IntegratedToolGenerator } from '../../src/schema_first/integrated_tool_generator.js';
const execAsync = promisify(exec);
// テスト用の簡単なツール仕様
const testToolSpec = {
    name: 'test_customer_tool',
    description: 'Simple customer management tool for testing',
    entities: [
        {
            name: 'Customer',
            fields: [
                { name: 'id', type: 'string', required: true, primaryKey: true, description: 'Customer ID' },
                { name: 'name', type: 'string', required: true, description: 'Customer name' },
                { name: 'email', type: 'string', required: true, unique: true, description: 'Customer email' }
            ],
            relationships: [],
            indexes: [],
            constraints: []
        }
    ],
    operations: [
        {
            name: 'createCustomer',
            type: 'create',
            entity: 'Customer',
            description: 'Create a new customer',
            inputs: [
                { name: 'name', type: 'string', required: true, description: 'Customer name' },
                { name: 'email', type: 'string', required: true, description: 'Customer email' }
            ],
            outputs: [
                { name: 'id', type: 'string', description: 'Created customer ID' },
                { name: 'name', type: 'string', description: 'Customer name' },
                { name: 'email', type: 'string', description: 'Customer email' }
            ]
        },
        {
            name: 'listCustomers',
            type: 'list',
            entity: 'Customer',
            description: 'List all customers',
            inputs: [
                { name: 'limit', type: 'number', required: false, description: 'Maximum number of results' }
            ],
            outputs: [
                { name: 'customers', type: 'array', description: 'List of customers' },
                { name: 'total', type: 'number', description: 'Total count' }
            ]
        }
    ]
};
test('E2E - Generated MCP tool can be built and works', async () => {
    const testDir = join(tmpdir(), 'mcp-test-' + Date.now());
    try {
        // 1. テスト用ディレクトリ作成
        await mkdir(testDir, { recursive: true });
        console.log(`Test directory: ${testDir}`);
        // 2. ツール生成
        console.log('🔨 Generating MCP tool...');
        const generator = new IntegratedToolGenerator();
        const generationOptions = {
            outputDir: testDir,
            toolName: testToolSpec.name,
            withUI: false, // UIなしでシンプルにテスト
            origin: 'http://localhost:3000'
        };
        await generator.generateIntegratedTool(testToolSpec, generationOptions);
        console.log('✅ Tool generation completed');
        // 3. 生成されたファイル構造を確認
        const packageJsonPath = join(testDir, 'package.json');
        const indexTsPath = join(testDir, 'index.ts');
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
        assert.equal(packageJson.name, testToolSpec.name.replace(/_/g, '-'));
        assert(await readFile(indexTsPath, 'utf-8'), 'index.ts should exist');
        console.log('✅ Generated file structure validated');
        // 4. 依存関係インストール
        console.log('📦 Installing dependencies...');
        await execAsync('npm install', { cwd: testDir });
        console.log('✅ Dependencies installed');
        // 5. TypeScript ビルド
        console.log('🔨 Building TypeScript...');
        await execAsync('npm run build', { cwd: testDir });
        console.log('✅ TypeScript build completed');
        // 6. 生成されたJavaScriptファイルが存在することを確認
        const indexJsPath = join(testDir, 'index.js');
        const indexJsContent = await readFile(indexJsPath, 'utf-8');
        assert(indexJsContent.includes('MCP'), 'Generated JS should contain MCP code');
        console.log('✅ Generated JavaScript validated');
        // 7. MCPサーバーとしての動作確認
        console.log('🚀 Testing MCP server functionality...');
        await testMcpServerFunctionality(testDir);
        console.log('✅ MCP server functionality verified');
    }
    finally {
        // クリーンアップ
        try {
            await rm(testDir, { recursive: true, force: true });
        }
        catch (error) {
            console.warn(`Cleanup failed: ${error}`);
        }
    }
});
/**
 * 生成されたMCPサーバーの機能をテスト
 */
async function testMcpServerFunctionality(toolDir) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('MCP server test timed out'));
        }, 30000); // 30秒タイムアウト
        // MCPサーバーを起動
        const serverProcess = spawn('node', ['index.js'], {
            cwd: toolDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                DATABASE_URL: 'postgresql://test:test@localhost:5432/test'
            }
        });
        let stdout = '';
        let stderr = '';
        serverProcess.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        serverProcess.stderr?.on('data', (data) => {
            stderr += data.toString();
            // サーバーが起動したかチェック
            if (stderr.includes('MCP Server running') || stderr.includes('running')) {
                console.log('📡 MCP server started successfully');
                // tools/list リクエストをテスト
                testToolsList(serverProcess)
                    .then(() => {
                    clearTimeout(timeout);
                    serverProcess.kill();
                    resolve();
                })
                    .catch((error) => {
                    clearTimeout(timeout);
                    serverProcess.kill();
                    reject(error);
                });
            }
        });
        serverProcess.on('error', (error) => {
            clearTimeout(timeout);
            reject(new Error(`Server process error: ${error.message}`));
        });
        serverProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                clearTimeout(timeout);
                reject(new Error(`Server exited with code ${code}. Stderr: ${stderr}`));
            }
        });
    });
}
/**
 * tools/list リクエストをテスト
 */
async function testToolsList(serverProcess) {
    return new Promise((resolve, reject) => {
        const request = {
            jsonrpc: '2.0',
            id: 'test-1',
            method: 'tools/list',
            params: {}
        };
        // リクエスト送信
        serverProcess.stdin?.write(JSON.stringify(request) + '\n');
        let responseData = '';
        const onData = (data) => {
            responseData += data.toString();
            try {
                const response = JSON.parse(responseData.trim());
                if (response.id === 'test-1') {
                    // レスポンス検証
                    assert(response.result, 'Response should have result');
                    assert(response.result.tools, 'Result should have tools array');
                    assert(Array.isArray(response.result.tools), 'Tools should be array');
                    assert(response.result.tools.length > 0, 'Should have at least one tool');
                    // 期待されるツールが存在するか確認
                    const toolNames = response.result.tools.map((t) => t.name);
                    assert(toolNames.includes('createCustomer'), 'Should have createCustomer tool');
                    assert(toolNames.includes('listCustomers'), 'Should have listCustomers tool');
                    console.log(`✅ Found tools: ${toolNames.join(', ')}`);
                    serverProcess.stdout?.off('data', onData);
                    resolve();
                }
            }
            catch (error) {
                // JSON パースエラーは無視（部分的なデータの可能性）
                if (!responseData.includes('}')) {
                    return;
                }
                reject(new Error(`Failed to parse response: ${error}. Data: ${responseData}`));
            }
        };
        serverProcess.stdout?.on('data', onData);
        // タイムアウト
        setTimeout(() => {
            serverProcess.stdout?.off('data', onData);
            reject(new Error('tools/list request timed out'));
        }, 10000);
    });
}
test('E2E - Generated tool with UI components', async () => {
    const testDir = join(tmpdir(), 'mcp-ui-test-' + Date.now());
    try {
        await mkdir(testDir, { recursive: true });
        console.log('🔨 Generating MCP tool with UI...');
        const generator = new IntegratedToolGenerator();
        const generationOptions = {
            outputDir: testDir,
            toolName: 'test_ui_tool',
            withUI: true,
            origin: 'http://localhost:3000',
            allowedTools: ['createCustomer', 'listCustomers']
        };
        await generator.generateIntegratedTool(testToolSpec, generationOptions);
        // UI関連ファイルが生成されているか確認
        const uiResourcesPath = join(testDir, 'ui-resources');
        const integrationPath = join(testDir, 'integration');
        assert(await readFile(join(integrationPath, 'ui-tool-broker.ts'), 'utf-8'), 'UI tool broker should be generated');
        console.log('✅ UI components generated successfully');
    }
    finally {
        try {
            await rm(testDir, { recursive: true, force: true });
        }
        catch (error) {
            console.warn(`Cleanup failed: ${error}`);
        }
    }
});
console.log('🧪 MCP Generation E2E Tests loaded');
//# sourceMappingURL=mcp-generation-e2e.test.js.map