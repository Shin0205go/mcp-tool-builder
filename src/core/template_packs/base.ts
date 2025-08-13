import { BuilderSpec, Entity, Action, View } from '../spec/builder_spec.js';

/**
 * Template Pack Interface
 * ドメイン非依存のテンプレート群の抽象化
 */
export interface TemplatePack {
  name: string;
  version: string;
  description: string;
  
  /**
   * このテンプレートパックがサポートする機能セット
   */
  supports(features: FeatureSet): boolean;
  
  /**
   * アクションからツールコードを生成
   */
  renderTool(action: Action, context: TemplateContext): Promise<GeneratedFile>;
  
  /**
   * ビューからUIコードを生成
   */
  renderView(view: View, context: TemplateContext): Promise<GeneratedFile>;
  
  /**
   * エンティティからDAOコードを生成
   */
  renderDAO(entity: Entity, context: TemplateContext): Promise<GeneratedFile>;
  
  /**
   * ダッシュボードコードを生成
   */
  renderDashboard(metrics: DashboardMetric[], context: TemplateContext): Promise<GeneratedFile>;
  
  /**
   * マイグレーションファイルを生成
   */
  renderMigration(entities: Entity[], context: TemplateContext): Promise<GeneratedFile>;
  
  /**
   * 設定ファイルを生成
   */
  renderConfig(spec: BuilderSpec, context: TemplateContext): Promise<GeneratedFile[]>;
  
  /**
   * テストファイルを生成
   */
  renderTests(spec: BuilderSpec, context: TemplateContext): Promise<GeneratedFile[]>;
  
  /**
   * ドキュメントを生成
   */
  renderDocs(spec: BuilderSpec, context: TemplateContext): Promise<GeneratedFile[]>;
}

export interface FeatureSet {
  crud: boolean;
  workflow: boolean;
  analytics: boolean;
  realtime: boolean;
  auth: boolean;
  search: boolean;
  export: boolean;
  i18n: boolean;
  testing?: boolean;
}

export interface TemplateContext {
  spec: BuilderSpec;
  providers: ProviderMap;
  config: GenerationConfig;
  metadata: Record<string, any>;
}

export interface ProviderMap {
  storage: string;
  queue?: string;
  auth?: string;
  notify?: string;
  search?: string;
  payment?: string;
  llm?: string;
}

export interface GenerationConfig {
  outputDir: string;
  language: 'typescript' | 'javascript' | 'python' | 'go';
  framework?: string;
  uiRenderer: 'rawHtml' | 'react' | 'vue' | 'svelte';
  target: 'local' | 'serverless' | 'docker' | 'kubernetes';
  features: FeatureSet;
  i18n: {
    locale: string;
    supportedLocales: string[];
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'code' | 'config' | 'test' | 'doc' | 'asset';
  executable?: boolean;
  metadata?: Record<string, any>;
}

export interface DashboardMetric {
  name: string;
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'gauge' | 'histogram';
  entity?: string;
  field?: string;
  label: string;
  description?: string;
  format?: string;
}

/**
 * Template Pack Registry
 */
export class TemplatePackRegistry {
  private packs = new Map<string, TemplatePack>();
  
  register(pack: TemplatePack): void {
    this.packs.set(pack.name, pack);
  }
  
  get(name: string): TemplatePack | undefined {
    return this.packs.get(name);
  }
  
  list(): TemplatePack[] {
    return Array.from(this.packs.values());
  }
  
  /**
   * 機能要件に最適なテンプレートパックを選択
   */
  select(features: FeatureSet, preferences?: string[]): TemplatePack | null {
    const candidates = this.list().filter(pack => pack.supports(features));
    
    if (candidates.length === 0) return null;
    
    // 優先度がある場合は考慮
    if (preferences) {
      for (const preferred of preferences) {
        const pack = candidates.find(p => p.name === preferred);
        if (pack) return pack;
      }
    }
    
    // デフォルトは最初にマッチしたもの
    return candidates[0];
  }
}

export const templatePackRegistry = new TemplatePackRegistry();

/**
 * Base Template Pack
 * 他のテンプレートパックの基底クラス
 */
export abstract class BaseTemplatePack implements TemplatePack {
  abstract name: string;
  abstract version: string;
  abstract description: string;
  
  abstract supports(features: FeatureSet): boolean;
  
  /**
   * Handlebars風のテンプレート置換
   */
  protected renderTemplate(template: string, context: Record<string, any>): string {
    let result = template;
    
    // Simple variable replacement {{variable}}
    Object.entries(context).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });
    
    // Conditional blocks {{#if condition}}...{{/if}}
    result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
      return context[condition] ? content : '';
    });
    
    // Loop blocks {{#each items}}...{{/each}}
    result = result.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, template) => {
      const array = context[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        let itemTemplate = template;
        // Replace {{this}} with current item
        itemTemplate = itemTemplate.replace(/{{this}}/g, String(item));
        // Replace {{@index}} with current index
        itemTemplate = itemTemplate.replace(/{{@index}}/g, String(index));
        // Replace {{item.property}} with item properties
        if (typeof item === 'object' && item !== null) {
          Object.entries(item).forEach(([prop, val]) => {
            const propRegex = new RegExp(`{{this\\.${prop}}}`, 'g');
            itemTemplate = itemTemplate.replace(propRegex, String(val || ''));
          });
        }
        return itemTemplate;
      }).join('');
    });
    
    return result;
  }
  
  /**
   * ファイル名を生成
   */
  protected generateFileName(name: string, type: string, extension: string): string {
    const sanitized = name.replace(/[^a-zA-Z0-9]/g, '');
    return `${sanitized}${type}.${extension}`;
  }
  
  /**
   * PascalCase変換
   */
  protected toPascalCase(str: string): string {
    return str.replace(/(?:^|[-_])(\w)/g, (_, char) => char.toUpperCase());
  }
  
  /**
   * camelCase変換
   */
  protected toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
  
  /**
   * kebab-case変換
   */
  protected toKebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
  
  /**
   * snake_case変換
   */
  protected toSnakeCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  }
  
  // Abstract methods that must be implemented by subclasses
  abstract renderTool(action: Action, context: TemplateContext): Promise<GeneratedFile>;
  abstract renderView(view: View, context: TemplateContext): Promise<GeneratedFile>;
  abstract renderDAO(entity: Entity, context: TemplateContext): Promise<GeneratedFile>;
  abstract renderDashboard(metrics: DashboardMetric[], context: TemplateContext): Promise<GeneratedFile>;
  abstract renderMigration(entities: Entity[], context: TemplateContext): Promise<GeneratedFile>;
  abstract renderConfig(spec: BuilderSpec, context: TemplateContext): Promise<GeneratedFile[]>;
  abstract renderTests(spec: BuilderSpec, context: TemplateContext): Promise<GeneratedFile[]>;
  abstract renderDocs(spec: BuilderSpec, context: TemplateContext): Promise<GeneratedFile[]>;
}