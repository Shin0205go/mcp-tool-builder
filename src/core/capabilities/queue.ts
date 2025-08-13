/**
 * Queue Provider Interface
 * バックグラウンドジョブ、イベント処理の抽象化
 */
export interface QueueProvider {
  name: string;
  
  /**
   * ジョブをキューに追加
   */
  enqueue(queue: string, payload: any, opts?: EnqueueOptions): Promise<{ jobId: string }>;
  
  /**
   * キューを購読してジョブを処理
   */
  subscribe(queue: string, handler: JobHandler): Promise<void>;
  
  /**
   * 購読を停止
   */
  unsubscribe(queue: string): Promise<void>;
  
  /**
   * ジョブの状態を取得
   */
  getJobStatus(jobId: string): Promise<JobStatus>;
  
  /**
   * ジョブをキャンセル
   */
  cancelJob(jobId: string): Promise<boolean>;
  
  /**
   * ジョブの進捗を更新
   */
  updateJobProgress(jobId: string, progress: number, message?: string): Promise<void>;
  
  /**
   * 遅延ジョブをスケジュール
   */
  schedule(queue: string, payload: any, executeAt: Date, opts?: ScheduleOptions): Promise<{ jobId: string }>;
  
  /**
   * 定期実行ジョブを登録
   */
  recurring(queue: string, payload: any, cron: string, opts?: RecurringOptions): Promise<{ scheduleId: string }>;
  
  /**
   * キューの統計情報を取得
   */
  getQueueStats(queue: string): Promise<QueueStats>;
  
  /**
   * 初期化処理
   */
  initialize(config: QueueConfig): Promise<void>;
  
  /**
   * 終了処理
   */
  dispose(): Promise<void>;
}

export interface EnqueueOptions {
  idempotencyKey?: string;
  delaySec?: number;
  priority?: number;
  maxRetries?: number;
  retryBackoff?: 'fixed' | 'exponential';
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface ScheduleOptions extends Omit<EnqueueOptions, 'delaySec'> {
  timezone?: string;
}

export interface RecurringOptions extends ScheduleOptions {
  enabled?: boolean;
  endDate?: Date;
}

export type JobHandler = (payload: any, context: JobContext) => Promise<any>;

export interface JobContext {
  jobId: string;
  queue: string;
  attempt: number;
  maxRetries: number;
  metadata: Record<string, any>;
  updateProgress: (progress: number, message?: string) => Promise<void>;
  log: (level: 'info' | 'warn' | 'error', message: string, data?: any) => void;
}

export interface JobStatus {
  jobId: string;
  queue: string;
  state: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled' | 'delayed';
  progress: number;
  message?: string;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempt: number;
  maxRetries: number;
}

export interface QueueStats {
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface QueueConfig {
  connectionString?: string;
  defaultQueue?: string;
  concurrency?: number;
  retryDelay?: number;
  jobExpiry?: number;
  options?: Record<string, any>;
}

/**
 * Queue Provider Registry
 */
export class QueueProviderRegistry {
  private providers = new Map<string, () => Promise<QueueProvider>>();
  
  register(name: string, factory: () => Promise<QueueProvider>): void {
    this.providers.set(name, factory);
  }
  
  async create(name: string, config: QueueConfig): Promise<QueueProvider> {
    const factory = this.providers.get(name);
    if (!factory) {
      throw new Error(`Queue provider '${name}' not found`);
    }
    
    const provider = await factory();
    await provider.initialize(config);
    return provider;
  }
  
  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const queueRegistry = new QueueProviderRegistry();