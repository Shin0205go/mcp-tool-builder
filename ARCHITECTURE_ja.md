# アーキテクチャガイド

MCP Tool Builderの内部アーキテクチャと設計原則の詳細な概要。

## 🏗️ 全体アーキテクチャ

```
┌──────────────────────────────────────────────────────────┐
│                    自然言語入力                            │
│                 "顧客管理システムを作成"                    │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│                   LLMベース仕様生成器                      │
│              (Anthropic Claude / OpenAI GPT)             │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    ビルダー仕様 (IR)                       │
│          エンティティ、アクション、ビュー、ポリシー          │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│                   生成パイプライン                         │
│     PreGenerate → MapCapabilities → Emit → PostGenerate  │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│                  テンプレートパック                        │
│            CRUD / Workflow / Analytics / Custom          │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│                 生成されたMCPツール                        │
│       TypeScript + Zod + Docker + Tests + Docs          │
└──────────────────────────────────────────────────────────┘
```

## 🎯 コア設計原則

### 1. 仕様優先設計

**ビルダー仕様**は、すべてのコード生成の単一の真実の源として機能します：

```typescript
interface BuilderSpec {
  entities: Entity[];      // データモデル
  actions: Action[];       // ビジネス操作
  views: View[];          // UIコンポーネント
  flows: Flow[];          // ワークフロー
  policies: Policy[];     // セキュリティルール
  capabilities: Capability[]; // 必要なプロバイダー
}
```

この中間表現により以下が保証されます：
- UI、API、データベース間の一貫性
- 型安全性と検証
- 異なるテンプレートパック間の移植性

### 2. 能力駆動型アーキテクチャ

**能力**は実装から要件を抽象化します：

```typescript
interface StorageCapability {
  type: 'storage';
  operations: ['create', 'read', 'update', 'delete'];
  provider: 'postgres' | 'mongodb' | 'custom';
}
```

利点：
- プロバイダーの入れ替えが可能
- テスト用のモック実装
- 段階的な機能追加

### 3. テンプレートパックシステム

**テンプレートパック**はドメインに依存しないコード生成パターンです：

```typescript
interface TemplatePack {
  name: string;
  version: string;
  abi: string;  // Application Binary Interface version
  
  supports(features: FeatureSet): boolean;
  renderTool(action: Action, context: TemplateContext): Promise<GeneratedFile>;
  renderView(view: View, context: TemplateContext): Promise<GeneratedFile>;
  renderDAO(entity: Entity, context: TemplateContext): Promise<GeneratedFile>;
}
```

ABI契約により以下が保証されます：
- テンプレートパック間の互換性
- 予測可能な出力構造
- 拡張性とカスタマイズ

### 4. セキュアバイデフォルト

すべての生成されたコードには以下が含まれます：

```typescript
// 自動的に含まれるセキュリティ
- 入力検証（Zod）
- SQLインジェクション防止
- XSS保護
- RBAC/ABAC
- レート制限
- 監査ログ
- PIIマスキング
```

### 5. プログレッシブエンハンスメント

基本的なCRUDから始めて、段階的に機能を追加：

```bash
# ステップ1: 基本CRUD
npm run generate:ui "顧客管理"

# ステップ2: UI追加
npm run generate:ui "顧客管理" --with-ui

# ステップ3: ワークフロー追加
npm run generate:ui "顧客管理" --with-ui --enable-workflow

# ステップ4: 分析追加
npm run generate:ui "顧客管理" --with-ui --enable-workflow --enable-analytics
```

## 📦 コンポーネントアーキテクチャ

### コアコンポーネント

```
src/core/
├── spec/              # ビルダー仕様定義
│   └── builder_spec.ts
├── capabilities/      # プロバイダー抽象化
│   ├── storage.ts
│   ├── queue.ts
│   └── auth.ts
├── template_packs/    # コード生成テンプレート
│   ├── base.ts
│   └── crud_pack.ts
├── generator/         # 生成パイプライン
│   └── hooks.ts
└── config/           # 設定管理
    └── builder_config.ts
```

### 仕様生成器

```
src/spec_generator/
└── llm_based.ts      # LLMベースの仕様生成
```

自然言語をビルダー仕様に変換：
1. プロンプトを解析
2. エンティティを抽出
3. アクションを推論
4. ビューを決定
5. ポリシーを適用

### スキーマファースト生成器

```
src/schema_first/
├── schema_generator.ts        # Zodスキーマ生成
├── integrated_tool_generator.ts # 統合ツール生成
├── ui_template_engine.ts      # UIコンポーネント生成
└── ui_tool_broker.ts          # UI-MCPブリッジ
```

### 生成されたツール構造

```
generated/my-tool/
├── schemas/           # Zodスキーマ（真実の源）
├── mcp-tools/        # MCPツール実装
├── business-logic/   # ピュアなビジネス関数
├── dao/             # データアクセス層
├── ui-resources/    # 生成されたUIコンポーネント
├── migrations/      # データベースマイグレーション
├── tests/           # 自動生成されたテスト
├── docs/            # APIドキュメント
└── docker/          # コンテナ設定
```

## 🔄 生成パイプライン

### 1. PreGenerate フェーズ

```typescript
interface PreGenerateHook {
  validate(spec: BuilderSpec): ValidationResult;
  normalize(spec: BuilderSpec): BuilderSpec;
  lint(spec: BuilderSpec): LintResult;
}
```

責任：
- 仕様の検証
- データの正規化
- 品質チェック
- セキュリティスキャン

### 2. MapCapabilities フェーズ

```typescript
interface CapabilityMapper {
  analyze(spec: BuilderSpec): RequiredCapabilities;
  selectProviders(capabilities: RequiredCapabilities): ProviderMap;
  validateCompatibility(providers: ProviderMap): boolean;
}
```

責任：
- 必要な能力の識別
- プロバイダーの選択
- 互換性の検証
- 設定の生成

### 3. Emit フェーズ

```typescript
interface EmitHook {
  selectTemplatePack(features: FeatureSet): TemplatePack;
  generateFiles(spec: BuilderSpec, pack: TemplatePack): GeneratedFile[];
  organizStructure(files: GeneratedFile[]): FileTree;
}
```

責任：
- テンプレートパックの選択
- コード生成
- ファイル編成
- 依存関係の解決

### 4. PostGenerate フェーズ

```typescript
interface PostGenerateHook {
  validateOutput(artifacts: GeneratedArtifacts): ValidationResult;
  runTests(artifacts: GeneratedArtifacts): TestResult;
  generateDocs(artifacts: GeneratedArtifacts): Documentation;
  createMetadata(artifacts: GeneratedArtifacts): Metadata;
}
```

責任：
- 出力の検証
- テストの実行
- ドキュメントの生成
- メタデータの作成

## 🔐 セキュリティアーキテクチャ

### 多層防御

```
┌─────────────────────────────────────┐
│         入力検証層 (Zod)             │
├─────────────────────────────────────┤
│      認証層 (OAuth/JWT/API Keys)     │
├─────────────────────────────────────┤
│        認可層 (RBAC/ABAC)           │
├─────────────────────────────────────┤
│     ビジネスロジック層（ピュア）      │
├─────────────────────────────────────┤
│    データアクセス層（パラメータ化）    │
├─────────────────────────────────────┤
│      データベース（暗号化）          │
└─────────────────────────────────────┘
```

### セキュリティポリシー

```yaml
policies:
  piiMask:
    enabled: true
    fields: [email, phone, ssn]
  rbac:
    enabled: true
    roles:
      - name: admin
        permissions: ['*']
      - name: user
        permissions: ['read']
  rateLimit:
    enabled: true
    windowMs: 60000
    max: 60
```

## 🔌 拡張ポイント

### カスタムテンプレートパック

```typescript
class CustomTemplatePack extends BaseTemplatePack {
  name = 'custom-pack';
  version = '1.0.0';
  abi = '1.0.0';
  
  supports(features: FeatureSet): boolean {
    return features.customFeature === true;
  }
  
  async renderTool(action: Action, context: TemplateContext): Promise<GeneratedFile> {
    // カスタム生成ロジック
  }
}

// 登録
templatePackRegistry.register(new CustomTemplatePack());
```

### カスタムプロバイダー

```typescript
class CustomStorageProvider implements StorageProvider {
  async find(entity: string, query: any): Promise<any[]> {
    // カスタムストレージ実装
  }
  
  async create(entity: string, data: any): Promise<any> {
    // カスタム作成ロジック
  }
}

// 登録
storageProviderRegistry.register('custom', CustomStorageProvider);
```

### カスタムフック

```typescript
class CustomHook implements GeneratorHook {
  async preGenerate(spec: BuilderSpec, context: GenerationContext): Promise<PreGenerateResult> {
    // カスタム前処理
  }
  
  async postGenerate(artifacts: GeneratedArtifacts, context: GenerationContext): Promise<PostGenerateResult> {
    // カスタム後処理
  }
}

// 登録
generatorPipeline.addHook(new CustomHook());
```

## 🎮 ランタイムアーキテクチャ

### MCPサーバー

```typescript
// 生成されたMCPサーバー
class GeneratedMCPServer {
  private server: Server;
  private tools: Map<string, ToolHandler>;
  
  constructor() {
    this.server = new Server({
      name: 'generated-tool',
      version: '1.0.0'
    });
    
    this.registerTools();
    this.setupHandlers();
  }
  
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
```

### UI-Tool ブローカー

```typescript
// UI通信の安全なブリッジ
class UIToolBroker {
  private idempotency = new IdempotencyManager();
  private jobs = new JobManager();
  
  attachToIframe(iframe: HTMLIFrameElement) {
    // オリジン検証
    // メッセージハンドリング
    // ジョブ管理
  }
  
  async handleToolInvocation(message: McpToolInvocation): Promise<void> {
    // 冪等性チェック
    // ツール実行
    // 結果返却
  }
}
```

## 📊 パフォーマンス最適化

### コード生成の最適化

- インクリメンタル生成
- テンプレートキャッシング
- 並列ファイル書き込み
- 依存関係の事前解決

### ランタイム最適化

- 接続プーリング
- クエリ最適化
- レスポンスキャッシング
- 非同期処理

## 🔍 品質保証

### 生成コードの品質

- TypeScript strict mode
- ESLintルール適用
- Prettierフォーマット
- 包括的な型カバレッジ

### テスト戦略

```
単体テスト → 統合テスト → E2Eテスト → 負荷テスト
     ↓            ↓            ↓           ↓
  ビジネス     データ層      ワークフロー  パフォーマンス
  ロジック
```

## 🚀 ロードマップ

### Phase 1: コア機能 ✅
- 基本的なCRUD生成
- PostgreSQL対応
- Docker対応

### Phase 2: 拡張機能 ✅
- マルチプロバイダー対応
- UI生成
- ワークフロー対応

### Phase 3: エンタープライズ機能 🚧
- マルチテナント対応
- GraphQL生成
- Kubernetes対応

### Phase 4: AI機能 📅
- ベクトルDB統合
- RAG対応
- 自動最適化

---

詳細な技術仕様については、[docs/](./docs/)ディレクトリを参照してください。