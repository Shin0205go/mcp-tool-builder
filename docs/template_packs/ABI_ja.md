# Template Pack ABI (アプリケーションバイナリインターフェース)

Template PackのABIは、コード生成テンプレートと実行時環境間の契約を定義します。

## ABI バージョン: 1.0.0

### コアインターフェース

```typescript
export interface TemplatePack {
  name: string;
  version: string;
  description: string;
  abi: string; // "1.0.0"
  
  // 機能チェック
  supports(features: FeatureSet): boolean;
  
  // コード生成メソッド
  renderTool(action: Action, context: TemplateContext): Promise<GeneratedFile>;
  renderView(view: View, context: TemplateContext): Promise<GeneratedFile>;
  renderDAO(entity: Entity, context: TemplateContext): Promise<GeneratedFile>;
  renderDashboard(metrics: DashboardMetric[], context: TemplateContext): Promise<GeneratedFile>;
  renderMigration(entities: Entity[], context: TemplateContext): Promise<GeneratedFile>;
  renderConfig(spec: BuilderSpec, context: TemplateContext): Promise<GeneratedFile[]>;
  renderTests(spec: BuilderSpec, context: TemplateContext): Promise<GeneratedFile[]>;
  renderDocs(spec: BuilderSpec, context: TemplateContext): Promise<GeneratedFile[]>;
}
```

### 入力契約

#### アクション契約
```typescript
interface Action {
  name: string;
  type: 'create' | 'read' | 'update' | 'delete' | 'list' | 'search' | 'custom';
  entity: string;
  parameters: Field[];
  validation: ValidationRule[];
  async: boolean;
  permissions: string[];
}
```

#### エンティティ契約
```typescript
interface Entity {
  name: string;
  fields: Field[];
  relationships: Relationship[];
  indexes: Index[];
  constraints: Constraint[];
}
```

#### テンプレートコンテキスト契約
```typescript
interface TemplateContext {
  spec: BuilderSpec;
  providers: ProviderMap;
  config: GenerationConfig;
  metadata: Record<string, any>;
}
```

### 出力契約

#### 生成ファイル契約
```typescript
interface GeneratedFile {
  path: string;           // 出力ディレクトリからの相対パス
  content: string;        // ファイル内容
  type: 'code' | 'config' | 'test' | 'doc' | 'asset';
  executable?: boolean;   // ファイルを実行可能にするか
  metadata?: Record<string, any>;
}
```

### ランタイム要件

#### MCPツール契約
生成されたMCPツールは以下を実装する必要があります：
```typescript
// ツール関数シグネチャ
type ToolFunction = (args: Record<string, any>) => Promise<ToolResult>;

interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}
```

#### DAO契約
生成されたDAOクラスは以下を実装する必要があります：
```typescript
interface BaseDAO<T> {
  find(query: any, options?: FindOptions): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(data: Partial<T>, opts?: CreateOptions): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}
```

#### UIコンポーネント契約
生成されたUIコンポーネントは以下を満たす必要があります：
- `data-props`属性経由でプロパティを受け取る（JSON形式）
- RequestId付きで`postMessage`経由でイベントを発火
- Request ID経由で冪等性を実装
- クライアント側ですべての入力を検証

### エラーハンドリング

Template Packは優雅にエラーを処理する必要があります：
```typescript
interface PackError extends Error {
  code: string;
  context?: Record<string, any>;
}
```

### バージョニング

ABIはセマンティックバージョニングに従います：
- **メジャー**: インターフェースへの破壊的変更
- **マイナー**: 新しいオプション機能
- **パッチ**: バグ修正、インターフェース変更なし

現在のバージョン: **1.0.0** - 初期安定版ABI

### 互換性の約束

ABI 1.x.yを実装するTemplate Packは以下と互換性が保証されます：
- ジェネレーターバージョン 2.0.0+
- ABI 1.x.yをサポートするランタイムバージョン
- すべてのプロバイダータイプ（ストレージ、キュー、認証など）

### テスト要件

Template Pack実装には以下が必要です：
1. 各renderメソッドのユニットテスト
2. サンプル仕様での統合テスト
3. 生成されたコードのコンパイルテスト
4. ランタイム動作テスト

## 実装例

### 最小限のTemplate Pack

```typescript
import { BaseTemplatePack } from './base.js';

export class MinimalPack extends BaseTemplatePack {
  name = 'minimal';
  version = '1.0.0';
  abi = '1.0.0';
  description = '最小限の実装例';

  supports(features: FeatureSet): boolean {
    // 基本的なCRUDのみサポート
    return features.crud && !features.workflow;
  }

  async renderTool(action: Action, context: TemplateContext): Promise<GeneratedFile> {
    const content = `
      // ${action.name} ツール
      export async function ${action.name}(args: any) {
        // 実装
        return { content: [{ type: "text", text: "Success" }] };
      }
    `;

    return {
      path: `tools/${action.name}.ts`,
      content,
      type: 'code'
    };
  }

  // 他のメソッドも同様に実装...
}
```

### Template Pack登録

```typescript
import { templatePackRegistry } from './base.js';
import { CrudPack } from './crud_pack.js';
import { WorkflowPack } from './workflow_pack.js';

// パックを登録
templatePackRegistry.register(new CrudPack());
templatePackRegistry.register(new WorkflowPack());

// 機能に基づいてパックを選択
const features = { crud: true, workflow: false };
const pack = templatePackRegistry.select(features);
```

## ベストプラクティス

### 1. 決定論的な出力
同じ入力に対して常に同じ出力を生成する。

### 2. エラーの明確な報告
```typescript
if (!action.entity) {
  throw new PackError('Entity is required for action', {
    action: action.name,
    type: action.type
  });
}
```

### 3. 拡張性の考慮
```typescript
// 将来の拡張のためにmetadataを使用
if (context.metadata?.customFeature) {
  // カスタム機能の処理
}
```

### 4. テストの包括性
```typescript
describe('CrudPack', () => {
  test('ABI compliance', () => {
    expect(pack.abi).toBe('1.0.0');
  });
  
  test('generates valid TypeScript', async () => {
    const result = await pack.renderTool(mockAction, mockContext);
    expect(isValidTypeScript(result.content)).toBe(true);
  });
});
```

## 移行ガイド

### 0.x から 1.0.0へ

1. **インターフェース更新**
   - 古い: `generateTool(action)` 
   - 新しい: `renderTool(action, context)`

2. **コンテキスト追加**
   - すべてのrenderメソッドにコンテキストパラメータを追加

3. **ABIバージョン宣言**
   - `abi = '1.0.0'`をパッククラスに追加

## トラブルシューティング

### よくある問題

**問題**: Template Packが認識されない
```typescript
// 解決: パックを登録
templatePackRegistry.register(new MyPack());
```

**問題**: 生成されたコードがコンパイルできない
```typescript
// 解決: TypeScriptの妥当性を確認
const content = generateTypeScript();
validateTypeScript(content);
```

**問題**: ランタイムエラー
```typescript
// 解決: エラーハンドリングを追加
try {
  await executeTool();
} catch (error) {
  return { isError: true, content: [...] };
}
```

## サポートされているTemplate Pack

### 公式パック

| パック名 | バージョン | ABI | 説明 |
|---------|-----------|-----|------|
| crud | 1.0.0 | 1.0.0 | 基本的なCRUD操作 |
| workflow | 1.0.0 | 1.0.0 | ワークフローエンジン |
| analytics | 1.0.0 | 1.0.0 | 分析とダッシュボード |
| ecommerce | 1.0.0 | 1.0.0 | Eコマース機能 |

### コミュニティパック

Template Packの作成と共有についてはコミュニティガイドラインを参照してください。

---

**最終更新**: 2024-12-08  
**バージョン**: 1.0.0  
**互換性**: MCP Tool Builder 2.0.0+