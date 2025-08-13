# クイックスタートガイド

MCP Tool Builderを使って、5分で最初のMCPツールを作成しましょう！

## 📋 前提条件

必要なもの：
- Node.js 18以上
- npm または yarn
- Docker（オプション、推奨）
- Claude Desktop（MCPツールをテストする場合）

## 🚀 ステップ1: インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-org/mcp-tool-builder
cd mcp-tool-builder

# 依存関係をインストール
npm install

# プロジェクトをビルド
npm run build
```

## 🎯 ステップ2: 最初のツールを生成

### オプション1: 最小限の例を試す（推奨）

```bash
# 動作する最小限の例を確認
cd examples/minimal/simple-note-tool
npm install
npm run build
npm start
```

これは完全に機能するメモ管理MCPツールです。コードを確認して、MCPの基本を理解できます。

### オプション2: 新しいツールを生成

```bash
# プロジェクトルートに戻る
cd ../../..

# シンプルなツールを生成
npm run generate:ui "タスク管理システム"
```

出力例：
```
🚀 MCP Tool Builder with UI - Schema-first Edition
🔍 Analyzing prompt...
✅ Tool specification created: task_management_system
   Entities: Task
   Operations: createTask, updateTask, listTasks, deleteTask
🔨 Generating MCP tool...
✅ Generation complete!
📍 Location: ./generated/task_management_system
```

## 💻 ステップ3: 生成されたツールをセットアップ

```bash
# 生成されたディレクトリに移動
cd generated/task_management_system

# 依存関係をインストール
npm install

# 環境設定をコピー
cp .env.example .env
```

`.env`ファイルを編集（オプション）：
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/task_db
NODE_ENV=development
```

## 🐳 ステップ4: データベースをセットアップ（2つの方法）

### 方法A: Docker を使用（推奨）

```bash
# Docker Composeでデータベースを起動
docker-compose up -d

# マイグレーションを実行
docker-compose exec app npm run db:migrate
```

### 方法B: ローカルPostgreSQLを使用

```bash
# データベースを作成
createdb task_db

# マイグレーションを実行
npm run db:migrate
```

## 🎮 ステップ5: ツールを実行

```bash
# ビルドして実行
npm run build
npm start
```

成功メッセージ：
```
MCP Server running on stdio
Ready to accept connections...
```

## 🔗 ステップ6: Claude Desktopに接続

1. Claude Desktopの設定ファイルを開く：
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. MCPサーバーを追加：
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/path/to/generated/task_management_system/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:password@localhost:5432/task_db"
      }
    }
  }
}
```

3. Claude Desktopを再起動

4. Claudeで使用：
```
"タスク管理ツールを使って新しいタスクを作成して"
"すべてのタスクをリストして"
"ID 1のタスクを完了にして"
```

## 🎨 ステップ7: UIを追加（オプション）

UIコンポーネントも生成したい場合：

```bash
# UIを含むツールを生成
npm run generate:ui "タスク管理システム" --with-ui

# 生成されたUIを確認
cd generated/task_management_system/ui-resources
# HTMLファイルをブラウザで開く
```

## 🚀 より高度な例

### CRMシステム with 全機能

```bash
npm run generate:ui "顧客関係管理システム" \
  --preset crm \
  --with-ui \
  --enable-analytics \
  --enable-workflow
```

これにより以下が生成されます：
- 完全なCRUD操作
- ウェブUI
- 分析ダッシュボード
- ワークフローエンジン
- メール通知
- RBAC（ロールベースアクセス制御）

### Eコマースプラットフォーム

```bash
npm run generate:ui "オンラインストア" \
  --preset ecommerce \
  --with-ui \
  --enable-payment
```

これにより以下が生成されます：
- 商品管理
- 注文処理
- Stripe決済統合
- 在庫管理
- 顧客ポータル

## 📚 生成されたツールの構造

```
task_management_system/
├── schemas/           # Zodスキーマ（型定義）
├── mcp-tools/        # MCPツール実装
├── business-logic/   # ビジネスロジック
├── dao/             # データアクセス層
├── migrations/      # DBマイグレーション
├── tests/           # テストファイル
├── docker-compose.yml # Docker設定
└── package.json     # 依存関係
```

## 🔧 設定のカスタマイズ

`builder.config.yaml`を作成して設定をカスタマイズ：

```yaml
name: my-awesome-tool
preset: custom
providers:
  storage: postgres
  queue: redis
  auth: jwt
ui:
  enabled: true
  renderer: react
generation:
  features:
    crud: true
    workflow: true
    analytics: true
```

設定を検証：
```bash
npm run config:validate builder.config.yaml
```

## 🐛 トラブルシューティング

### よくある問題

**データベース接続エラー**
```bash
# Dockerが実行中か確認
docker-compose ps

# ログを確認
docker-compose logs postgres
```

**ポート競合**
```bash
# docker-compose.ymlのポートを変更
# 5432 → 5433など
```

**TypeScriptエラー**
```bash
# クリーンビルド
rm -rf dist/
npm run build
```

### システム状態の確認

```bash
# システム診断を実行
npm run ui:info --system
```

出力：
```
🔧 MCP Tool Builder - System Status
📦 Runtime Environment:
   Node.js: v20.0.0
   Platform: darwin x64
🔐 Environment Configuration:
   ANTHROPIC_API_KEY: ✅ configured
   DATABASE_URL: ✅ configured
✅ System ready for generation
```

## 🎓 次のステップ

1. **例を探索**: [examples/](./examples/)ディレクトリをチェック
2. **ドキュメントを読む**: [README_ja.md](./README_ja.md)で詳細を確認
3. **アーキテクチャを理解**: [ARCHITECTURE_ja.md](./ARCHITECTURE_ja.md)を読む
4. **プロバイダーを確認**: [docs/providers/](./docs/providers/)で利用可能なプロバイダーを確認
5. **カスタマイズ**: 独自のテンプレートパックを作成

## 💡 ヒント

- 🎯 **シンプルに始める**: 基本的なCRUDから始めて、徐々に機能を追加
- 🔒 **セキュリティはデフォルト**: すべてのセキュリティ機能がデフォルトで有効
- 📝 **生成されたコードを読む**: 生成されたコードは学習に最適
- 🧪 **テストを実行**: `npm test`で生成されたテストを確認
- 🐳 **Dockerを使用**: 開発環境の一貫性のために

## 🆘 ヘルプ

問題が発生した場合：

1. **FAQ確認**: [README_ja.md#faq](./README_ja.md#faq)
2. **Issue検索**: [GitHub Issues](https://github.com/your-org/mcp-tool-builder/issues)
3. **新しいIssue作成**: 詳細なエラーメッセージと再現手順を含める

---

🎉 **おめでとうございます！** 最初のMCPツールが作成されました。自然言語から本番環境対応のツールまで、わずか数分で完成です！