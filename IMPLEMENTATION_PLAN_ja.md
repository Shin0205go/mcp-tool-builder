# MCP Tool Builder v3: スキーマファーストの実装計画

## アーキテクチャの核となる変更

### 1. 契約駆動生成 (contracts/*.schema.json → 成果物)
```
contracts/customer.schema.json → 
├── migrations/001_create_customers.sql (PostgreSQL)
├── generated/schemas/customer.ts (Zodスキーマ)  
├── generated/adapters/customer.ts (型アダプター)
├── generated/mcp-tools/customer-*.ts (MCPツール)
├── generated/resources/dashboard.ts (UIリソース)
└── dist/index.js (エントリーポイント)
```

### 2. 固定ABIテンプレート (.ejs)
```
src/templates/
├── schema.ts.ejs          # Zodスキーマ生成  
├── adapters.ts.ejs        # 型変換 (DB↔API)
├── tool.ts.ejs           # アダプター適用MCPツール
├── resource.ts.ejs       # postMessage付きUIリソース
├── migration.sql.ejs     # PostgreSQL DDL
└── index.ts.ejs         # 全MCPエンドポイント付きメインサーバー
```

### 3. 型システムの強制
- すべてのAPIレスポンスは `toApi*(dbRow)` アダプターを通す
- すべてのDB挿入は `toStorage*(apiData)` アダプターを通す  
- Zodスキーマが唯一の真実源泉を定義

### 4. 組み込みUI配信
- `resources/list` は `ui://project/dashboard` を返す
- `resources/read` は postMessage ブローカー埋め込みHTMLを返す
- UIは `mcp:tool.invoke` でallowTools強制によりツールを呼び出す

## 実装ステップ
1. 契約スキーマローダーの作成
2. EJSテンプレートシステムの構築  
3. 型アダプターの実装
4. MCPエンドポイントハンドラーの追加
5. UIリソースの生成
6. バリデーション付きCLI統合