/**
 * BuilderSpec Sanitizer
 * LLMの出力仕様を正規化し、テンプレート生成エラーを防ぐ
 */

export interface BuilderSpec {
  name: string;
  description: string;
  entities: Entity[];
  actions: Action[];
  views?: View[];
}

export interface Entity {
  name: string;
  fields: Field[];
}

export interface Field {
  name: string;
  type: StandardType;
  required: boolean;
  description?: string;
}

export interface Action {
  name: string;
  type: ActionType;
  entity: string;
  input?: Field[];
  output?: Field[];
  description?: string;
}

export interface View {
  name: string;
  type: ViewType;
  uses: string[]; // action names
  description?: string;
}

// 標準型定義（LLMの曖昧な型語彙を正規化）
export type StandardType = 
  | 'string' | 'number' | 'boolean' 
  | 'uuid' | 'email' | 'date' | 'datetime' 
  | 'phone' | 'price';

export type ActionType = 
  | 'create' | 'get' | 'update' | 'delete' 
  | 'list' | 'search';

export type ViewType = 
  | 'form' | 'list' | 'detail' | 'dashboard';

/**
 * 型マッピング辞書（LLMが出力する型語彙 → 標準型）
 */
const TYPE_MAP: Record<string, StandardType> = {
  // String variants
  'string': 'string',
  'text': 'string', 
  'varchar': 'string',
  'char': 'string',
  
  // Email variants
  'email': 'email',
  'mail': 'email',
  'e-mail': 'email',
  
  // Number variants
  'number': 'number',
  'int': 'number',
  'integer': 'number',
  'float': 'number',
  'decimal': 'number',
  
  // Boolean variants
  'boolean': 'boolean',
  'bool': 'boolean',
  
  // UUID variants
  'uuid': 'uuid',
  'guid': 'uuid',
  'id': 'uuid',
  
  // Date variants
  'date': 'date',
  'datetime': 'datetime',
  'timestamp': 'datetime',
  
  // Phone variants
  'phone': 'phone',
  'tel': 'phone',
  'telephone': 'phone',
  
  // Price variants
  'price': 'price',
  'money': 'price',
  'currency': 'price',
  'amount': 'price'
};

/**
 * 予約語回避マッピング
 */
const RESERVED_WORDS = ['class', 'function', 'const', 'let', 'var', 'export', 'import', 'default', 'type', 'interface'];

/**
 * BuilderSpecのサニタイザ
 */
export class SpecSanitizer {
  
  /**
   * メイン正規化処理
   */
  sanitize(rawSpec: any): BuilderSpec {
    const spec = this.validateStructure(rawSpec);
    
    return {
      name: this.sanitizeName(spec.name),
      description: spec.description || '',
      entities: spec.entities.map((e: any) => this.sanitizeEntity(e)),
      actions: spec.actions.map((a: any) => this.sanitizeAction(a)),
      views: spec.views?.map((v: any) => this.sanitizeView(v)) || []
    };
  }
  
  /**
   * 構造バリデーション
   */
  private validateStructure(spec: any): any {
    if (!spec || typeof spec !== 'object') {
      throw new Error('BuilderSpec must be an object');
    }
    
    if (!spec.name || typeof spec.name !== 'string') {
      throw new Error('BuilderSpec.name is required and must be string');
    }
    
    if (!Array.isArray(spec.entities) || spec.entities.length === 0) {
      throw new Error('BuilderSpec.entities is required and must be non-empty array');
    }
    
    if (!Array.isArray(spec.actions) || spec.actions.length === 0) {
      throw new Error('BuilderSpec.actions is required and must be non-empty array');
    }
    
    return spec;
  }
  
  /**
   * エンティティ正規化
   */
  private sanitizeEntity(entity: any): Entity {
    const sanitizedFields = this.deduplicateFields(
      entity.fields?.map((f: any) => this.sanitizeField(f)) || []
    );
    
    return {
      name: this.sanitizeName(entity.name),
      fields: sanitizedFields
    };
  }
  
  /**
   * フィールド正規化
   */
  private sanitizeField(field: any): Field {
    return {
      name: this.sanitizeFieldName(field.name),
      type: this.normalizeType(field.type),
      required: Boolean(field.required),
      description: field.description
    };
  }
  
  /**
   * アクション正規化
   */
  private sanitizeAction(action: any): Action {
    const actionType = this.normalizeActionType(action.type);
    
    return {
      name: this.sanitizeActionName(action.name),
      type: actionType,
      entity: this.sanitizeName(action.entity),
      input: action.input?.map((f: any) => this.sanitizeField(f)),
      output: this.getStandardOutput(actionType, action.output),
      description: action.description
    };
  }
  
  /**
   * ビュー正規化
   */
  private sanitizeView(view: any): View {
    return {
      name: this.sanitizeName(view.name),
      type: this.normalizeViewType(view.type),
      uses: Array.isArray(view.uses) ? view.uses : [],
      description: view.description
    };
  }
  
  /**
   * 名前正規化（PascalCase）
   */
  private sanitizeName(name: string): string {
    if (!name) return 'Unknown';
    
    const cleaned = name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .split('_')
      .filter(part => part.length > 0)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
    
    // 予約語チェック
    if (RESERVED_WORDS.includes(cleaned.toLowerCase())) {
      return cleaned + 'Entity';
    }
    
    return cleaned || 'Unknown';
  }
  
  /**
   * フィールド名正規化（camelCase）
   */
  private sanitizeFieldName(name: string): string {
    if (!name) return 'field';
    
    const cleaned = name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .split('_')
      .filter(part => part.length > 0)
      .map((part, index) => 
        index === 0 
          ? part.toLowerCase()
          : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      )
      .join('');
    
    // 予約語チェック
    if (RESERVED_WORDS.includes(cleaned)) {
      return cleaned + 'Field';
    }
    
    return cleaned || 'field';
  }
  
  /**
   * アクション名正規化（camelCase）
   */
  private sanitizeActionName(name: string): string {
    if (!name) return 'action';
    return this.sanitizeFieldName(name);
  }
  
  /**
   * 型正規化
   */
  private normalizeType(type: string): StandardType {
    if (!type || typeof type !== 'string') {
      return 'string'; // デフォルト
    }
    
    const normalized = type.toLowerCase().trim();
    return TYPE_MAP[normalized] || 'string';
  }
  
  /**
   * アクションタイプ正規化
   */
  private normalizeActionType(type: string): ActionType {
    if (!type) return 'create';
    
    const normalized = type.toLowerCase();
    const actionTypes: ActionType[] = ['create', 'get', 'update', 'delete', 'list', 'search'];
    
    return actionTypes.find(at => normalized.includes(at)) || 'create';
  }
  
  /**
   * ビュータイプ正規化
   */
  private normalizeViewType(type: string): ViewType {
    if (!type) return 'form';
    
    const normalized = type.toLowerCase();
    const viewTypes: ViewType[] = ['form', 'list', 'detail', 'dashboard'];
    
    return viewTypes.find(vt => normalized.includes(vt)) || 'form';
  }
  
  /**
   * フィールド重複除去
   */
  private deduplicateFields(fields: Field[]): Field[] {
    const seen = new Set<string>();
    return fields.filter(field => {
      if (seen.has(field.name)) {
        return false;
      }
      seen.add(field.name);
      return true;
    });
  }
  
  /**
   * 標準出力定義（アクションタイプ別）
   */
  private getStandardOutput(actionType: ActionType, customOutput?: Field[]): Field[] | undefined {
    switch (actionType) {
      case 'delete':
        return [{ name: 'success', type: 'boolean', required: true }];
      case 'list':
      case 'search':
        // カスタム出力は無視して標準形に強制
        return undefined; // テンプレート側で配列形式を処理
      default:
        return customOutput;
    }
  }
}

/**
 * ファクトリー関数
 */
export function createSpecSanitizer(): SpecSanitizer {
  return new SpecSanitizer();
}