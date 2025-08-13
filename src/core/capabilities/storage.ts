/**
 * Storage Provider Interface
 * データベース、ファイルシステム、API等の抽象化
 */
export interface StorageProvider {
  name: string;
  
  /**
   * エンティティを検索
   */
  find(entity: string, query: any, options?: FindOptions): Promise<any[]>;
  
  /**
   * IDで単一エンティティを取得
   */
  get(entity: string, id: string): Promise<any | null>;
  
  /**
   * エンティティを作成
   */
  create(entity: string, data: any, opts?: CreateOptions): Promise<any>;
  
  /**
   * エンティティを更新
   */
  update(entity: string, id: string, data: any, opts?: UpdateOptions): Promise<any>;
  
  /**
   * エンティティを削除
   */
  delete(entity: string, id: string, opts?: DeleteOptions): Promise<void>;
  
  /**
   * バッチ操作
   */
  batch(operations: BatchOperation[], opts?: BatchOptions): Promise<BatchResult>;
  
  /**
   * 統計情報を取得
   */
  getStats(entity: string, metrics: string[]): Promise<Record<string, any>>;
  
  /**
   * トランザクションを開始
   */
  transaction<T>(fn: (tx: StorageTransaction) => Promise<T>): Promise<T>;
  
  /**
   * 初期化処理
   */
  initialize(config: StorageConfig): Promise<void>;
  
  /**
   * 終了処理
   */
  dispose(): Promise<void>;
}

export interface FindOptions {
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  include?: string[];
  select?: string[];
}

export interface CreateOptions {
  idempotencyKey?: string;
  skipValidation?: boolean;
}

export interface UpdateOptions {
  idempotencyKey?: string;
  upsert?: boolean;
  partial?: boolean;
}

export interface DeleteOptions {
  cascade?: boolean;
  softDelete?: boolean;
}

export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  entity: string;
  data?: any;
  id?: string;
}

export interface BatchResult {
  success: boolean;
  operations: Array<{
    operation: BatchOperation;
    success: boolean;
    result?: any;
    error?: string;
  }>;
}

export interface BatchOptions {
  idempotencyKey?: string;
  failFast?: boolean;
}

export interface StorageTransaction {
  find(entity: string, query: any, options?: FindOptions): Promise<any[]>;
  get(entity: string, id: string): Promise<any | null>;
  create(entity: string, data: any, opts?: CreateOptions): Promise<any>;
  update(entity: string, id: string, data: any, opts?: UpdateOptions): Promise<any>;
  delete(entity: string, id: string, opts?: DeleteOptions): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface StorageConfig {
  connectionString?: string;
  options?: Record<string, any>;
  schemas?: Record<string, any>;
  migrations?: string[];
}

/**
 * Storage Provider Registry
 */
export class StorageProviderRegistry {
  private providers = new Map<string, () => Promise<StorageProvider>>();
  
  register(name: string, factory: () => Promise<StorageProvider>): void {
    this.providers.set(name, factory);
  }
  
  async create(name: string, config: StorageConfig): Promise<StorageProvider> {
    const factory = this.providers.get(name);
    if (!factory) {
      throw new Error(`Storage provider '${name}' not found`);
    }
    
    const provider = await factory();
    await provider.initialize(config);
    return provider;
  }
  
  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const storageRegistry = new StorageProviderRegistry();