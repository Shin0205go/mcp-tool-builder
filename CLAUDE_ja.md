# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリでコードを扱う際のガイダンスを提供します。

## クイックスタートコマンド

- **プロジェクトビルド**: `npm run build` - TypeScriptをJavaScriptとブラウザ用バンドルにコンパイル
- **MCPツール生成**: `npm run generate:ui "ツールの説明"` - 基本MCPツール生成
- **UI付き生成**: `npm run generate:ui "ツールの説明" --with-ui --ui-origin http://localhost:3000` - UIコンポーネント付きツール生成
- **テスト実行**: `npm test` - テストスイート実行とビルド検証
- **開発モード**: `npm run dev` - TypeScriptコンパイルのウォッチモード
- **コードリント**: `npm run lint` - ESLint検証
- **コード整形**: `npm run format` - Prettierコード整形

## アーキテクチャ概要

これは、能力駆動・テンプレートパック方式アーキテクチャを使用して、自然言語記述から本番対応のMCP（Model Context Protocol）ツールを生成する**汎用MCPツールビルダー**です。

### 核となるアーキテクチャレイヤー

1. **スキーマファースト生成**: TypeScript型、JSONスキーマ、UIフォームを自動生成するZodスキーマによる唯一の真実源泉
2. **テンプレートパックシステム**: 様々なドメイン（CRUD、Eコマース、CRMなど）向けのプラガブルジェネレーター
3. **能力レジストリ**: PostgreSQL、Redis、OAuth、決済システム向けのプロバイダー抽象化
4. **UI自動生成**: オリジン検証とpostMessage通信による安全なWebインターフェース
5. **本番機能**: Docker展開、マイグレーション、監視、監査ログ

### 主要コンポーネント

- `src/index_schema_first.ts` - メインCLIエントリーポイントと生成コマンド
- `src/schema_first/integrated_tool_generator.ts` - コアツール生成エンジン
- `src/schema_first/llm_based.ts` - LLM駆動仕様生成
- `src/core/template_packs/` - テンプレートパック実装
- `src/templates/` - コード生成用EJSテンプレート
- `generated/` と `generated_project/` - 生成されたツールの出力ディレクトリ

### 生成アプローチ

1. **スキーマファースト** (`generate`): LLMが仕様生成 → 固定テンプレート → 完全なツール
2. **LLM-in-the-Loop** (`generate-v2`): TypeScript検証付き反復LLM改良

## 重要な開発パターン

### 生成されたツール構造
```
generated_project/tool_name/
├── schemas/           # Zodスキーマ（唯一の真実源泉）
├── mcp-tools/         # MCPツール定義
├── business-logic/    # 純粋ビジネス関数
├── dao/               # データアクセス層
├── integration/       # UI-ツールブローカー（--with-ui使用時）
├── migrations/        # データベースマイグレーション
└── package.json       # 生成された依存関係
```

### UIセキュリティモデル
`--with-ui` フラグ使用時、生成されたツールには以下が含まれます：
- **オリジン検証**: すべてのpostMessage通信が `UI_ORIGIN` に対して検証される
- **ツール許可リスト**: 指定されたツールのみがUIから呼び出し可能
- **冪等性**: requestIdによるリクエスト重複排除
- **サンドボックス**: 制限された権限のiframe

### テンプレートパック開発
テンプレートパックは `BaseTemplatePack` を拡張し、以下を実装します：
- `supports(features)` - 機能互換性チェック
- `renderTool(action, context)` - ツールコード生成
- `renderSchema(entity)` - スキーマ生成

## テストと品質

- 生成されたすべてのツールに包括的なテストスイートが含まれる
- TypeScript strict mode適用
- パラメータ化クエリによるSQLインジェクション防止
- すべての境界でのZodによる入力検証
- 生成されたコードは一貫性のあるパターンに従う

## 設定

- `builder.config.yaml` - プリセットとプロバイダー向けメイン設定ファイル
- 生成されたプロジェクト内の `.env` ファイル（データベースURLとUIオリジン用）
- `src/templates/` 内のEJSテンプレートによるテンプレートカスタマイゼーション

## 本番展開

生成されたツールには以下が含まれます：
- DockerとDocker Composeファイル
- データベースマイグレーションスクリプト
- 環境設定例
- ヘルスチェックと監視セットアップ

このシステムは開発速度よりもセキュリティ、型安全性、本番対応を優先します。