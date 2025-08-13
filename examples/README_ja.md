# 例（サンプル）

MCP Tool Builderの機能を実証する実行可能なサンプルです。

## 🚀 クイックスタート - 最小限の例

MCP Tool Builderを理解する最も速い方法：

```bash
cd minimal/simple-note-tool
npm install
npm run build
npm start
```

**得られるもの**: わずか~250行のコードで、CRUD操作、入力検証、エラーハンドリングを含む完全に機能するMCPツール。

## 📁 利用可能な例

### [`minimal/`](./minimal/)
- **simple-note-tool/**: 可能な限りシンプルで動作するMCPツール
- **generated_tool/**: 基本生成コマンドからの出力
- 複雑さを排除したMCPのコア概念を示す

### 近日公開
- **basic-crud/**: データベースを使った顧客管理
- **e-commerce/**: 決済統合付きの完全なオンラインストア
- **crm/**: ワークフロー管理付きの営業パイプライン
- **support/**: ロールベースアクセス付きのチケットシステム
- **analytics/**: ビジネスインテリジェンスダッシュボード

## 🎯 学習パス

1. **ここから始める**: [`minimal/simple-note-tool`](./minimal/simple-note-tool/) - MCPの基礎を理解
2. **独自生成**: `npm run generate:ui "あなたのアイデア"`
3. **複雑さの追加**: `--preset crm --with-ui`などのプリセットを試す
4. **高度な探索**: `../generated/`の生成された例を確認

## 🛠 新しい例の生成

```bash
# 基本CRUDシステム
npm run generate:ui "顧客管理システム"

# UI付きEコマース
npm run generate:ui "オンラインストア" --preset ecommerce --with-ui

# 分析付きCRM
npm run generate:ui "営業CRM" --preset crm --with-ui --enable-analytics

# ワークフロー付きサポートシステム
npm run generate:ui "サポートチケット" --preset support --with-ui
```

すべての生成された例には以下が含まれます：
- ✅ 完全なTypeScript実装
- ✅ Dockerデプロイメントセットアップ
- ✅ データベースマイグレーション
- ✅ 入力検証
- ✅ エラーハンドリング
- ✅ ドキュメンテーション

## 📖 各例が教えること

| 例 | 概念 | 技術 | 難易度 |
|---------|----------|--------------|------------|
| **simple-note-tool** | MCPプロトコル、ツール登録、入力検証 | MCP SDK、Zod、TypeScript | ⭐ 初心者 |
| **generated_tool** | コード生成、アーキテクチャパターン | 同上 + PostgreSQL、Docker | ⭐⭐ 中級 |
| **crm** (生成済み) | ビジネスロジック、UI生成、セキュリティ | 同上 + React、RBAC、分析 | ⭐⭐⭐ 上級 |

## 🔧 カスタマイズ

各例はカスタマイズ可能です：

1. **スキーマの修正**: 異なるデータ構造用にZodスキーマを編集
2. **ツールの追加**: 新しいMCPツール関数の作成
3. **ストレージの変更**: メモリからデータベースへの切り替え
4. **UIの追加**: `--with-ui`でWebインターフェースを生成

## 🎓 実証されるベストプラクティス

- **型安全性**: 完全なTypeScriptカバレッジ
- **入力検証**: Zodによるランタイム検証
- **エラーハンドリング**: 適切なエラーレスポンス
- **クリーンアーキテクチャ**: 関心事の分離
- **ドキュメンテーション**: 自己文書化コード
- **テスト**: テスト構造（該当する場合）

最初のMCPツールを構築する準備はできましたか？最小限の例から始めましょう！