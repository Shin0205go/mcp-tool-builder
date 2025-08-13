# MCP Tool Builder - Architecture Specification

## Overview

MCP Tool Builder は、自然言語からプロダクション対応のMCPツールを生成する汎用ビルダーです。「仕様→生成→実行」パイプラインの各段階で拡張ポイントを規約化し、業務ドメインの変化に対応できる設計となっています。

## Core Architecture

### 🏗️ System Architecture

```
Natural Language Input
        ↓
    Spec Generator (LLM-based)
        ↓
    Builder Spec (Intermediate Representation)
        ↓
    Generator Hooks (Capability Resolution)
        ↓
    Template Packs (Code Generation)
        ↓
    Generated Artifacts (MCP + UI + Infrastructure)
```

### 🎯 Design Principles

1. **Spec-First**: 会話→中間仕様（entities/actions/views/flows/policies）に正規化
2. **Capability Registry**: storage/queue/auth等をプロバイダ差し替えで吸収
3. **Template Packs**: CRUD・ワークフロー・分析等のテンプレパックを切替可能
4. **Contract-Driven**: postMessage/Job/Eventプロトコルを統一
5. **Policy-Aware**: スキーマ検証・RBAC/ABAC・PIIマスキングを生成時と実行時に適用

### 📁 Package Structure

```
mcp-tool-builder/
├── core/                     # 核となるシステム
│   ├── spec/                # DSL定義・Builder Spec
│   │   ├── builder-spec.ts  # 中間仕様の型定義
│   │   └── validator.ts     # スペック検証・Lint
│   ├── capabilities/        # プロバイダ抽象化
│   │   ├── storage.ts       # ストレージプロバイダIF
│   │   ├── queue.ts         # キュープロバイダIF
│   │   ├── auth.ts          # 認証プロバイダIF
│   │   └── notify.ts        # 通知プロバイダIF
│   ├── template-packs/      # テンプレートパック
│   │   ├── base.ts          # 基底クラス・レジストリ
│   │   ├── crud.ts          # CRUDテンプレート
│   │   ├── workflow.ts      # ワークフローテンプレート
│   │   └── analytics.ts     # 分析テンプレート
│   ├── generator/           # 生成エンジン
│   │   ├── hooks.ts         # Generator Hooks
│   │   └── engine.ts        # メイン生成ロジック
│   └── config/              # 設定管理
│       └── builder-config.ts # builder.config.yaml対応
├── providers/               # 具体実装
│   ├── storage-postgres/
│   ├── storage-mongo/
│   ├── queue-redis/
│   └── auth-oidc/
├── presets/                 # ドメイン向け束ね
│   ├── crm.ts
│   ├── inventory.ts
│   └── ecommerce.ts
├── schema-first/           # Schema-first UI統合
│   ├── schema-generator.ts
│   ├── ui-template-engine.ts
│   ├── ui-tool-broker.ts
│   └── integrated-tool-generator.ts
├── cli/                    # コマンドラインIF
└── runtime-contracts/      # ランタイム契約
    ├── mcp-protocol.ts
    ├── job-protocol.ts
    └── ui-protocol.ts
```

## Core Components

### 1. Builder Spec (中間仕様)

**Purpose**: 自然言語から正規化された唯一の真実源泉

**Schema**:
```typescript
interface BuilderSpec {
  version: string;
  name: string;
  description: string;
  entities: Entity[];      // データモデル
  actions: Action[];       // ビジネスロジック
  views: View[];          // UI定義
  flows: Flow[];          // ワークフロー
  policies: Policy[];     // セキュリティポリシー
  capabilities: CapabilityRequirement[]; // 必要なプロバイダ
  i18n: I18nConfig;       // 国際化設定
}
```

**Features**:
- Zodベースの厳密な型検証
- Lint機能（命名規則、制約チェック）
- 品質スコア計算
- セキュリティポリシー自動検出

### 2. Capability Registry

**Purpose**: インフラストラクチャの抽象化と差し替え

**Supported Capabilities**:
- **Storage**: PostgreSQL, MongoDB, Sheets, REST API, Vector DB
- **Queue**: Redis, SQS, PubSub, Memory
- **Auth**: None, API Key, OAuth2/OIDC, JWT, Session
- **Notify**: Email, Webhook, Slack/Teams, Push
- **Search**: Basic, Elasticsearch, Vector Search
- **Payment**: Stripe, PayPal
- **LLM**: OpenAI, Anthropic, Local

**Interface Example**:
```typescript
interface StorageProvider {
  find(entity: string, query: any): Promise<any[]>;
  get(entity: string, id: string): Promise<any|null>;
  create(entity: string, data: any, opts?: {idempotencyKey?: string}): Promise<any>;
  // ... other CRUD operations
  batch(operations: BatchOperation[]): Promise<BatchResult>;
  transaction<T>(fn: (tx: StorageTransaction) => Promise<T>): Promise<T>;
}
```

### 3. Template Packs

**Purpose**: ドメイン非依存のコード生成テンプレート群

**Pack Types**:
- **CRUD Pack**: 基本的なCRUD操作
- **Workflow Pack**: 承認フロー、ステートマシン
- **Analytics Pack**: ダッシュボード、レポート生成
- **E-commerce Pack**: 決済、在庫管理特化
- **CRM Pack**: 顧客管理、セールスパイプライン特化

**Template Pack Interface**:
```typescript
interface TemplatePack {
  name: string;
  version: string;
  supports(features: FeatureSet): boolean;
  renderTool(action: Action, context: TemplateContext): Promise<GeneratedFile>;
  renderView(view: View, context: TemplateContext): Promise<GeneratedFile>;
  renderDAO(entity: Entity, context: TemplateContext): Promise<GeneratedFile>;
  // ... other render methods
}
```

### 4. Generator Hooks

**Purpose**: 生成パイプラインの拡張ポイント規約化

**Hook Points**:
```typescript
interface GeneratorHooks {
  preGenerate(spec: BuilderSpec): Promise<PreGenerateResult>;
  mapCapabilities(spec: BuilderSpec): Promise<ProviderMap>;
  emit(spec: BuilderSpec, providers: ProviderMap): Promise<GeneratedArtifacts>;
  postGenerate(artifacts: GeneratedArtifacts): Promise<PostGenerateResult>;
}
```

**Pre-Generate**:
- スペック正規化・Lint
- セキュリティポリシー検証
- 命名規則チェック
- 依存関係解析

**Capability Mapping**:
- 必要プロバイダの自動検出
- 設定ベースの上書き
- フォールバック設定

**Emit**:
- テンプレートパック選択
- 並列コード生成
- 依存関係解決

**Post-Generate**:
- 成果物検証
- 品質チェック
- ドキュメント生成

### 5. Configuration System

**builder.config.yaml**:
```yaml
preset: crm
providers:
  storage: postgres
  queue: redis
  auth: oidc
ui:
  renderer: rawHtml
  origin: https://mcp-ui.local
generation:
  templatePack: crud
  i18n: ja-JP
policies:
  piiMask:
    enabled: true
    fields: [Customer.email, Customer.phone]
  rbac:
    enabled: true
    roles:
      - name: Admin
        permissions: ["*"]
      - name: Operator
        permissions: ["Customer.*", "Coupon.send"]
```

## Schema-First UI Integration

### UI-Tool Communication Protocol

**Safe postMessage Contract**:
```typescript
// Tool invocation
type ToolInvoke = {
  type: 'mcp:tool.invoke';
  requestId: string;
  tool: string;
  params: any;
};

// Job management
type JobEvent = 
  | { type: 'mcp:job.start'; jobId: string }
  | { type: 'mcp:job.progress'; jobId: string; percent: number; message?: string }
  | { type: 'mcp:job.done'; jobId: string; result: any }
  | { type: 'mcp:job.error'; jobId: string; error: string };
```

**Security Features**:
- Origin verification for all postMessage
- Allowlist-based tool access control
- Request ID-based idempotency
- Content Security Policy friendly
- No inline script execution

**UI-Tool Broker**:
```typescript
class UIToolBroker {
  attachToIframe(iframe: HTMLIFrameElement): void;
  // - Origin verification
  // - Idempotency management
  // - Long-running job support
  // - Error handling & timeout
}
```

## Generated Architecture

### Output Structure
```
generated/my-tool/
├── schemas/              # Single source of truth
│   ├── customer.ts      # Zod schemas
│   └── order.ts
├── mcp-tools/           # MCP tool definitions
│   ├── createCustomer.ts
│   └── listOrders.ts
├── business-logic/      # Pure business functions
│   ├── createCustomer.ts
│   └── processOrder.ts
├── dao/                 # Data access layer
│   ├── CustomerDAO.ts
│   └── OrderDAO.ts
├── ui-resources/        # Generated UI components
│   ├── customer-form.html
│   ├── customer-list.html
│   └── order-dashboard.html
├── integration/         # UI-Tool broker setup
│   ├── ui-broker-setup.ts
│   └── allowlist.ts
├── migrations/          # Database migrations
│   ├── 001_initial_schema.sql
│   └── 002_add_indexes.sql
├── scripts/             # Development scripts
│   ├── migrate.js
│   └── seed.js
├── tests/               # Generated tests
├── docker-compose.yml   # Production deployment
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

### Runtime Architecture
```
UI Components (HTML/JS)
       ↓ (Safe postMessage)
UI-Tool Broker (Origin-verified)
       ↓ (Idempotent calls)
MCP Tools (Type-safe)
       ↓
Business Logic (Pure functions)
       ↓
DAO Layer (Zod-validated)
       ↓
Storage Provider (Abstracted)
       ↓
Database/External API
```

## Quality Assurance

### Contract Testing
- Zod schemas ensure UI/Tool/DAO consistency
- JSON Schema generation for API compatibility
- Runtime validation at all boundaries

### Golden Tests
- spec→generated code snapshot comparison
- Template regression prevention
- Breaking change detection

### Compatibility
- `specVersion`, `templatePackVersion`, `runtimeAbi` tracking
- Backward compatibility guarantees
- Migration path documentation

### Telemetry
Standard metrics embedded in generated code:
- `tool_latency_ms`: Tool execution time
- `job_runtime_ms`: Background job duration
- `ui_error_rate`: Frontend error frequency
- `schema_drift_detected`: Contract violations

## Extension Points

### Adding New Capabilities
```typescript
// 1. Define interface
interface PaymentProvider {
  processPayment(amount: number, token: string): Promise<PaymentResult>;
}

// 2. Register implementation
paymentRegistry.register('stripe', () => new StripeProvider());

// 3. Use in config
providers:
  payment: stripe
```

### Adding New Template Packs
```typescript
class ECommerceTemplatePack extends BaseTemplatePack {
  supports(features: FeatureSet): boolean {
    return features.crud && features.payment;
  }
  
  renderTool(action: Action, context: TemplateContext): Promise<GeneratedFile> {
    // E-commerce specific tool generation
  }
}

templatePackRegistry.register(new ECommerceTemplatePack());
```

### Adding New Presets
```yaml
# presets/marketplace.yaml
preset: marketplace
extends: ecommerce
providers:
  storage: postgres
  queue: redis
  auth: oauth
  payment: stripe
  search: elasticsearch
features:
  multiVendor: true
  commission: true
  escrow: true
```

## Development Workflow

### Service Creation Flow
1. **会話 → spec**: 同じDSL
2. **Capability検出**: メール送信があれば`notify`を追加
3. **Template Pack選択**: CRUD/Workflow/Analyticsを合成可
4. **Preset適用**: Providersを束ねて一括生成
5. **実行**: broker & jobプロトコルが一定なのでUI/Toolはそのまま動く

### Command Examples
```bash
# Basic generation
mcp-tool-builder generate "Customer management system"

# With configuration
mcp-tool-builder generate "E-commerce platform" \
  --config ./config/ecommerce.yaml \
  --preset ecommerce \
  --with-ui

# Initialize configuration
mcp-tool-builder config:init --preset crm

# Information
mcp-tool-builder ui:info
```

## Roadmap

### v2.0 (Current)
- ✅ Core capability registry
- ✅ Template pack system
- ✅ Schema-first UI generation
- ✅ Builder config support
- ✅ Generator hooks
- ✅ Contract testing

### v2.1 (Next)
- 🔄 Workflow pack implementation
- 🔄 Analytics pack implementation
- 🔄 React/Vue UI renderers
- 🔄 Policy engine full implementation
- 🔄 More provider implementations

### v2.2 (Future)
- Multi-language support (Python, Go)
- Kubernetes deployment templates
- Advanced monitoring & observability
- GraphQL API generation
- Real-time collaboration features

### v3.0 (Vision)
- AI-assisted business rule generation
- Visual workflow designer
- Multi-tenant SaaS generation
- Marketplace for template packs
- Enterprise governance features

## Security Considerations

### Generated Code Security
- Input validation at all boundaries
- SQL injection prevention
- XSS protection in UI components
- CSRF token implementation
- Rate limiting built-in

### Runtime Security
- Origin verification for UI communication
- JWT token validation
- RBAC/ABAC policy enforcement
- PII masking per role
- Audit logging for all operations

### Development Security
- Secrets management patterns
- Environment variable handling
- Docker security best practices
- Database connection security
- API key rotation support

---

This architecture provides a solid foundation for building maintainable, scalable, and secure MCP tools while maintaining the flexibility to adapt to changing business requirements.