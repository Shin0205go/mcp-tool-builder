/**
 * Simple MCP Generation Test
 * 
 * 生成プロセスが基本的に動作することを確認する簡単なテスト
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('Simple generation test - basic functionality', async () => {
  const testDir = join(tmpdir(), 'simple-test-' + Date.now());
  
  try {
    // 1. テスト用ディレクトリ作成
    await mkdir(testDir, { recursive: true });
    console.log(`✓ Test directory created: ${testDir}`);
    
    // 2. 基本的なファイル作成をテスト
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(testDir, 'test.txt'), 'Hello MCP Tool Builder!');
    console.log('✓ Basic file operations work');
    
    // 3. 基本的なgeneratorのインポートをテスト
    const { IntegratedToolGenerator } = await import('../../src/schema_first/integrated_tool_generator.js');
    const generator = new IntegratedToolGenerator();
    
    assert(typeof generator.generateIntegratedTool === 'function', 
           'Generator should have generateIntegratedTool method');
    
    console.log('✓ Generator class imports and instantiates correctly');
    
    // 4. LLMベーススペックジェネレーターのテスト (モック環境変数)
    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key-for-testing';
    
    try {
      const { LLMBasedSpecGenerator } = await import('../../src/schema_first/llm_based.js');
      const specGenerator = new LLMBasedSpecGenerator();
      
      assert(typeof specGenerator.generateFromPrompt === 'function',
             'Spec generator should have generateFromPrompt method');
      
      console.log('✓ Spec generator imports correctly');
    } finally {
      // 環境変数を元に戻す
      if (originalApiKey) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    }
    
    console.log('🎉 Simple generation test passed - all basic components work!');
    
  } finally {
    // クリーンアップ
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  }
});

test('Basic template system test', async () => {
  const { CrudTemplatePack } = await import('../../src/core/template_packs/crud_pack.js');
  
  const crudPack = new CrudTemplatePack();
  
  // ABI version check
  assert.equal(crudPack.name, 'crud');
  assert.equal(crudPack.version, '1.0.0');
  
  // Feature support check
  const basicFeatures = {
    crud: true,
    workflow: false,
    analytics: false,
    realtime: false,
    auth: false,
    search: false,
    export: false,
    i18n: false
  };
  
  assert.equal(crudPack.supports(basicFeatures), true);
  
  console.log('✓ CRUD template pack basic functionality works');
});

console.log('🧪 Simple Generation Tests loaded');