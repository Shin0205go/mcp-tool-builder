# MCP Tool Builder

**汎用MCPツールビルダー** - 自然言語から本番環境対応のMCPツールを生成。UI、セキュリティ、スケーラビリティを標準装備。

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)

## 🚀 MCP Tool Builderとは？

MCP Tool Builderは、自然言語の説明から完全に機能する本番環境対応のMCP（Model Context Protocol）ツールに変換します。**能力駆動型のテンプレートパックアーキテクチャ**により、セキュリティ、型安全性、スケーラビリティを維持しながら、あらゆるビジネスドメインに適応します。

### 主な機能

- 🎯 **仕様優先設計**: UI/API/DBの一貫性を自動保証する単一の真実の源
- 🔧 **能力レジストリ**: プラグ&プレイ型インフラ（PostgreSQL、Redis、OAuthなど）
- 🎨 **UI自動生成**: 手動コーディング不要の美しく安全なWebインターフェース
- 🛡️ **組み込みセキュリティ**: RBAC、PII マスキング、レート制限、監査ログ
- 📊 **テンプレートパック**: CRUD、ワークフロー、分析、Eコマースのプリセット
- 🌐 **マルチプロバイダー**: データベース、キュー、認証、決済プロバイダーの抽象化
- 🔒 **本番環境対応**: Docker、モニタリング、マイグレーション、テストを含む

## ⚡ クイックスタート

### インストール

```bash
git clone https://github.com/your-org/mcp-tool-builder
cd mcp-tool-builder
npm install
npm run build
```

### 最初のツールを生成

```bash
# 基本的なMCPツール
npm run generate:ui "顧客管理システム"

# UIを含む全機能版
npm run generate:ui "ダッシュボード付きタスクトラッカー" \
  --with-ui \
  --enable-analytics \
  --preset crm

# 設定の初期化
npm run config:init --preset ecommerce
```

### 例：Eコマースツール

```bash
npm run generate:ui "オンラインマーケットプレイス" \
  --preset ecommerce \
  --with-ui \
  --enable-payment \
  --enable-analytics
```

**生成されるもの**:
- 完全なCRUD操作とビジネスロジック
- Stripe決済統合
- リアルタイムの在庫管理
- 多言語対応
- セキュアな管理ダッシュボード
- 本番環境対応のDocker設定

## 🏗️ アーキテクチャ

```
自然言語の説明
    ↓
仕様生成（LLM）
    ↓
ビルダー仕様（中間表現）
    ↓
テンプレートパック（コード生成）
    ↓
本番環境対応のMCPツール
```

詳細は[ARCHITECTURE_ja.md](./ARCHITECTURE_ja.md)を参照してください。

## 💼 使用例

### 1. 基本的なCRUDシステム

```bash
npm run generate:ui "検索機能付き顧客データベース"
```

**生成される機能**:
- 顧客エンティティとフィールド
- 作成/読み取り/更新/削除ツール
- 検索機能
- フィルター付きリストビュー
- フォームバリデーション

### 2. ワークフローシステム

```bash
npm run generate:ui "承認ワークフロー付きサポートチケットシステム" \
  --preset support \
  --with-ui \
  --enable-workflow
```

**生成される機能**:
- チケットライフサイクル管理
- 承認ワークフローエンジン
- ロールベースのアクセス制御
- メール通知
- メトリクス付きダッシュボード

### 3. Eコマースプラットフォーム

```bash
npm run generate:ui "マルチベンダーマーケットプレイス" \
  --preset ecommerce \
  --with-ui \
  --enable-payment \
  --enable-analytics
```

**生成される機能**:
- 商品カタログ
- 注文処理
- 決済統合（Stripe）
- ベンダー管理
- 売上分析ダッシュボード

## 🎛️ 設定

### builder.config.yaml

```yaml
name: my-app
preset: crm
providers:
  storage: postgres
  queue: redis
  auth: oauth
ui:
  enabled: true
  renderer: react
  origin: https://app.example.com
generation:
  features:
    crud: true
    workflow: true
    analytics: true
    auth: true
policies:
  rbac:
    enabled: true
  piiMask:
    enabled: true
    fields: [email, phone, ssn]
```

## 🛡️ セキュリティ機能

### 組み込みセキュリティ

- **入力検証**: すべての境界でZodスキーマ検証
- **SQLインジェクション防止**: パラメータ化クエリのみ
- **XSS保護**: HTMLエスケープとCSPヘッダー
- **認証**: マルチプロバイダー対応（OAuth、JWT、APIキー）
- **認可**: きめ細かい権限を持つRBAC/ABAC
- **PIIマスキング**: 自動的な機密データ保護
- **レート制限**: 設定可能なリクエストスロットリング
- **監査ログ**: コンテキスト付きのすべての操作をログ記録

### UIセキュリティ

- **オリジン検証**: postMessage通信の保護
- **コンテンツセキュリティポリシー**: インラインスクリプトなし
- **冪等性**: 重複リクエストの防止
- **リクエスト署名**: 暗号化によるリクエスト整合性
- **セッション管理**: 安全なトークン処理

## 🔧 プロバイダー

### ストレージプロバイダー
- **PostgreSQL**: マイグレーション付きの完全なSQL対応
- **MongoDB**: 集約機能付きドキュメントストレージ
- **Google Sheets**: データベースとしてのスプレッドシート
- **REST API**: 外部サービス統合
- **Vector DB**: AI機能用の埋め込みストレージ

### キュープロバイダー
- **Redis**: 高速インメモリキューイング
- **AWS SQS**: マネージドクラウドキューイング
- **Google Pub/Sub**: イベント駆動メッセージング
- **Memory**: 開発/テスト用キュー

### 認証プロバイダー
- **OAuth 2.0/OIDC**: 標準ベースの認証
- **JWT**: ステートレストークン認証
- **APIキー**: シンプルなサービス認証
- **Session**: 従来のセッション管理

詳細は[Provider互換性マトリクス](./docs/providers/compatibility_ja.md)を参照してください。

## 📊 モニタリング＆可観測性

### 組み込みメトリクス

生成されたツールには自動的に以下が含まれます：

- **パフォーマンス**: `tool_latency_ms`、`db_query_time_ms`
- **ビジネス**: `orders_created_total`、`revenue_usd`
- **システム**: `memory_usage_mb`、`active_connections`
- **セキュリティ**: `auth_failures_total`、`rate_limit_hits`

### モニタリングスタック

```yaml
# 自動生成されるモニタリング
monitoring:
  enabled: true
  metrics:
    port: 9090
    path: /metrics
  logging:
    level: info
    format: json
  tracing:
    enabled: true
    serviceName: my-mcp-tool
```

## 🧪 テスト

### 生成されるテスト

すべてのツールには以下が含まれます：

- **ユニットテスト**: ビジネスロジックの検証
- **統合テスト**: データベースとAPIのテスト
- **契約テスト**: スキーマの互換性
- **E2Eテスト**: 完全なユーザーワークフローのテスト
- **負荷テスト**: パフォーマンスベンチマーク

### テストの実行

```bash
cd generated/my-tool
npm test                 # ユニットテスト
npm run test:integration # 統合テスト
npm run test:e2e        # エンドツーエンドテスト
npm run test:load       # 負荷テスト
```

## 🚀 デプロイメント

### ローカル開発

```bash
cd generated/my-tool
cp .env.example .env
npm install
npm run dev
```

### Dockerデプロイメント

```bash
docker-compose up -d
docker-compose exec app npm run db:migrate
```

### Kubernetes（生成済み）

```bash
kubectl apply -f k8s/
```

### サーバーレス（生成済み）

```bash
npm run deploy:serverless
```

## 💡 例

[examples/](./examples/)ディレクトリをチェックしてください：

- **minimal/simple-note-tool**: 最小限の動作するMCPツール
- **基本CRUD**: シンプルな顧客管理
- **Eコマース**: 完全なオンラインストア
- **CRM**: 営業パイプライン管理
- **サポート**: チケッティングシステム
- **分析**: ビジネスインテリジェンスダッシュボード

## ❓ FAQ

**Q: ローコードプラットフォームとどう違いますか？**
A: MCP Tool Builderは実際の読みやすく変更可能なコードを生成します。ベンダーロックインなし、完全なカスタマイズが可能です。

**Q: 生成されたコードを変更できますか？**
A: もちろん！生成されたコードは、完全に所有できるクリーンでドキュメント化されたTypeScriptです。

**Q: 生成されたツールはどの程度安全ですか？**
A: セキュリティは設計により組み込まれており、入力検証、SQLインジェクション防止、RBAC、PIIマスキング、監査ログが含まれます。

**Q: パフォーマンスはどうですか？**
A: 生成されたツールは、接続プーリング、キャッシング、効率的なデータベースクエリで本番環境向けに最適化されています。

**Q: 独自のデータベースを使用できますか？**
A: はい！プロバイダーシステムはPostgreSQL、MongoDB、MySQL、カスタム実装をサポートしています。

## 📝 ライセンス

MITライセンス - [LICENSE](./LICENSE)ファイルを参照してください。

## 🙏 謝辞

- AnthropicのModel Context Protocolチーム
- 優れたツールを提供するTypeScriptチーム
- ランタイム検証を提供するZod
- すべての素晴らしいオープンソースコントリビューター

---

**次のツールを構築する準備はできましたか？**

```bash
npm run generate:ui "あなたの素晴らしいアイデアをここに" --with-ui
```

🚀 **数ヶ月ではなく、数分でアイデアを本番環境へ！**