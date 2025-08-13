# Template Pack ABI (Application Binary Interface)

Template PackのABIは、コード生成テンプレートと実行時環境間の契約を定義します。

## ABI Version: 1.0.0

### Core Interface

```typescript
export interface TemplatePack {
  name: string;
  version: string;
  description: string;
  abi: string; // "1.0.0"
  
  // Capability check
  supports(features: FeatureSet): boolean;
  
  // Code generation methods
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

### Input Contracts

#### Action Contract
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

#### Entity Contract
```typescript
interface Entity {
  name: string;
  fields: Field[];
  relationships: Relationship[];
  indexes: Index[];
  constraints: Constraint[];
}
```

#### TemplateContext Contract
```typescript
interface TemplateContext {
  spec: BuilderSpec;
  providers: ProviderMap;
  config: GenerationConfig;
  metadata: Record<string, any>;
}
```

### Output Contracts

#### GeneratedFile Contract
```typescript
interface GeneratedFile {
  path: string;           // Relative path from output directory
  content: string;        // File content
  type: 'code' | 'config' | 'test' | 'doc' | 'asset';
  executable?: boolean;   // If file should be executable
  metadata?: Record<string, any>;
}
```

### Runtime Requirements

#### MCP Tool Contract
Generated MCP tools MUST implement:
```typescript
// Tool function signature
type ToolFunction = (args: Record<string, any>) => Promise<ToolResult>;

interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}
```

#### DAO Contract
Generated DAO classes MUST implement:
```typescript
interface BaseDAO<T> {
  find(query: any, options?: FindOptions): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(data: Partial<T>, opts?: CreateOptions): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}
```

#### UI Component Contract
Generated UI components MUST:
- Accept props via `data-props` attribute (JSON)
- Emit events via `postMessage` with RequestId
- Implement idempotency via Request IDs
- Validate all inputs client-side

### Error Handling

Template Packs MUST handle errors gracefully:
```typescript
interface PackError extends Error {
  code: string;
  context?: Record<string, any>;
}
```

### Versioning

ABI follows semantic versioning:
- **Major**: Breaking changes to interfaces
- **Minor**: New optional features
- **Patch**: Bug fixes, no interface changes

Current version: **1.0.0** - Initial stable ABI

### Compatibility Promise

Template Packs implementing ABI 1.x.y are guaranteed to work with:
- Generator versions 2.0.0+
- Runtime versions supporting ABI 1.x.y
- All provider types (storage, queue, auth, etc.)

### Testing Requirements

Template Pack implementations MUST include:
1. Unit tests for each render method
2. Integration tests with sample specs
3. Generated code compilation tests
4. Runtime behavior tests