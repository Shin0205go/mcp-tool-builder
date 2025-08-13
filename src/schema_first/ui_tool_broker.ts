/**
 * UI-Tool Broker System
 * 安全なpostMessage通信とidempotency管理
 * 
 * Note: This module is designed for browser environments.
 * For Node.js environments, DOM APIs will be undefined.
 */

// Browser environment check
const isBrowser = typeof globalThis !== 'undefined' && 
  typeof (globalThis as any).window !== 'undefined';

// Browser globals (safe access)
const getBrowserGlobals = () => {
  if (!isBrowser) return {};
  const g = globalThis as any;
  return {
    window: g.window,
    MutationObserver: g.MutationObserver,
    HTMLIFrameElement: g.HTMLIFrameElement
  };
};

export interface McpToolInvocation {
  type: 'mcp:tool.invoke';
  requestId: string;
  tool: string;
  params: any;
}

export interface McpToolResult {
  type: 'mcp:tool.result';
  requestId: string;
  result: any;
}

export interface McpToolError {
  type: 'mcp:tool.error';
  requestId: string;
  error: string;
}

export interface McpJobStart {
  type: 'mcp:job.start';
  requestId: string;
  jobId: string;
}

export interface McpJobProgress {
  type: 'mcp:job.progress';
  jobId: string;
  progress: number; // 0-100
  message?: string;
}

export interface McpJobDone {
  type: 'mcp:job.done';
  jobId: string;
  result: any;
}

export interface McpJobError {
  type: 'mcp:job.error';
  jobId: string;
  error: string;
}

type McpMessage = McpToolInvocation | McpToolResult | McpToolError | 
                  McpJobStart | McpJobProgress | McpJobDone | McpJobError;

export interface BrokerConfig {
  allowedOrigin: string;
  allowedTools: string[];
  maxConcurrentJobs: number;
  requestTimeoutMs: number;
  enableIdempotency: boolean;
}

export interface McpToolExecutor {
  (toolName: string, params: any, context: { idempotencyKey: string }): Promise<any>;
}

/**
 * Idempotency key管理
 */
class IdempotencyManager {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  set(key: string, result: any): void {
    this.cache.set(key, { result, timestamp: Date.now() });
    this.cleanup();
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.result;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL_MS) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Job管理（長時間処理用）
 */
class JobManager {
  private jobs = new Map<string, { 
    promise: Promise<any>; 
    controller: AbortController;
    startTime: number;
  }>();

  async startJob(
    jobId: string, 
    executor: () => Promise<any>,
    onProgress?: (progress: number, message?: string) => void
  ): Promise<string> {
    if (this.jobs.has(jobId)) {
      throw new Error(`Job ${jobId} already running`);
    }

    const controller = new AbortController();
    const promise = executor().finally(() => {
      this.jobs.delete(jobId);
    });

    this.jobs.set(jobId, { 
      promise, 
      controller,
      startTime: Date.now()
    });

    return jobId;
  }

  getJob(jobId: string) {
    return this.jobs.get(jobId);
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    
    job.controller.abort();
    this.jobs.delete(jobId);
    return true;
  }

  getActiveJobs(): string[] {
    return Array.from(this.jobs.keys());
  }
}

/**
 * UI-Tool Broker本体
 */
export class UIToolBroker {
  private idempotency = new IdempotencyManager();
  private jobs = new JobManager();
  private messageHandlers = new Map<string, (message: MessageEvent) => void>();

  constructor(
    private config: BrokerConfig,
    private toolExecutor: McpToolExecutor
  ) {}

  /**
   * iframeにブローカーを接続
   */
  attachToIframe(iframe: any): void {
    if (!isBrowser) {
      console.warn('UIToolBroker: Browser environment required');
      return;
    }
    const handler = this.createMessageHandler(iframe);
    const { window } = getBrowserGlobals();
    if (window) {
      window.addEventListener('message', handler);
    }
    
    // Store handler for cleanup
    const handlerId = Math.random().toString(36);
    this.messageHandlers.set(handlerId, handler);
    
    // Cleanup on iframe removal
    const { MutationObserver } = getBrowserGlobals();
    if (!MutationObserver) return;
    
    const observer = new MutationObserver((mutations: any[]) => {
      mutations.forEach((mutation: any) => {
        mutation.removedNodes.forEach((node: any) => {
          if (node === iframe) {
            this.detachHandler(handlerId);
            observer.disconnect();
          }
        });
      });
    });
    
    if (iframe.parentNode) {
      observer.observe(iframe.parentNode, { childList: true });
    }
  }

  /**
   * メッセージハンドラーを作成
   */
  private createMessageHandler(iframe: any) {
    return async (event: MessageEvent) => {
      // Origin検証（重要！）
      if (event.origin !== this.config.allowedOrigin) {
        console.warn(`Rejected message from unauthorized origin: ${event.origin}`);
        return;
      }

      const message = event.data as McpMessage;
      if (!message || typeof message !== 'object') return;

      try {
        switch (message.type) {
          case 'mcp:tool.invoke':
            await this.handleToolInvocation(message, iframe);
            break;
          default:
            console.warn(`Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('Broker error:', error);
        this.postError(iframe, (message as any).requestId, 'Internal broker error');
      }
    };
  }

  /**
   * ツール呼び出しを処理
   */
  private async handleToolInvocation(
    message: McpToolInvocation, 
    iframe: any
  ): Promise<void> {
    const { requestId, tool, params } = message;

    // ツール許可リストチェック
    if (!this.config.allowedTools.includes(tool)) {
      this.postError(iframe, requestId, `Tool '${tool}' is not allowed`);
      return;
    }

    // Idempotency check
    if (this.config.enableIdempotency) {
      const cached = this.idempotency.get(requestId);
      if (cached) {
        this.postResult(iframe, requestId, cached);
        return;
      }
    }

    try {
      // 長時間ジョブの判定（暫定的にツール名で判断）
      const isLongRunningJob = tool.includes('bulk') || 
                              tool.includes('export') || 
                              tool.includes('import') ||
                              tool.includes('batch');

      if (isLongRunningJob) {
        await this.handleLongRunningJob(message, iframe);
      } else {
        await this.handleSimpleToolCall(message, iframe);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.postError(iframe, requestId, errorMessage);
    }
  }

  /**
   * シンプルなツール呼び出し
   */
  private async handleSimpleToolCall(
    message: McpToolInvocation,
    iframe: any
  ): Promise<void> {
    const { requestId, tool, params } = message;

    const result = await this.toolExecutor(tool, params, {
      idempotencyKey: requestId
    });

    // Cache result for idempotency
    if (this.config.enableIdempotency) {
      this.idempotency.set(requestId, result);
    }

    this.postResult(iframe, requestId, result);
  }

  /**
   * 長時間ジョブの処理
   */
  private async handleLongRunningJob(
    message: McpToolInvocation,
    iframe: any
  ): Promise<void> {
    const { requestId, tool, params } = message;
    const jobId = `job_${requestId}_${Date.now()}`;

    // Job start notification
    this.postMessage(iframe, {
      type: 'mcp:job.start',
      requestId,
      jobId
    });

    try {
      await this.jobs.startJob(
        jobId,
        async () => {
          // Progress callback
          const onProgress = (progress: number, message?: string) => {
            this.postMessage(iframe, {
              type: 'mcp:job.progress',
              jobId,
              progress,
              message
            });
          };

          // Execute the actual tool
          const result = await this.toolExecutor(tool, params, {
            idempotencyKey: requestId
          });

          // Job completion
          this.postMessage(iframe, {
            type: 'mcp:job.done',
            jobId,
            result
          });

          return result;
        }
      );
    } catch (error: any) {
      this.postMessage(iframe, {
        type: 'mcp:job.error',
        jobId,
        error: error?.message || 'Job failed'
      });
    }
  }

  /**
   * 成功レスポンスを送信
   */
  private postResult(iframe: any, requestId: string, result: any): void {
    this.postMessage(iframe, {
      type: 'mcp:tool.result',
      requestId,
      result
    });
  }

  /**
   * エラーレスポンスを送信
   */
  private postError(iframe: any, requestId: string, error: string): void {
    this.postMessage(iframe, {
      type: 'mcp:tool.error',
      requestId,
      error
    });
  }

  /**
   * メッセージ送信（安全性チェック付き）
   */
  private postMessage(iframe: any, message: any): void {
    if (!iframe.contentWindow) {
      console.warn('Cannot post message: iframe contentWindow is null');
      return;
    }

    iframe.contentWindow.postMessage(message, this.config.allowedOrigin);
  }

  /**
   * ハンドラーをクリーンアップ
   */
  private detachHandler(handlerId: string): void {
    const handler = this.messageHandlers.get(handlerId);
    if (handler) {
      const { window } = getBrowserGlobals();
      if (window) {
        window.removeEventListener('message', handler);
      }
      this.messageHandlers.delete(handlerId);
    }
  }

  /**
   * 全てのハンドラーをクリーンアップ
   */
  cleanup(): void {
    const { window } = getBrowserGlobals();
    if (window) {
      this.messageHandlers.forEach((handler) => {
        window.removeEventListener('message', handler);
      });
    }
    this.messageHandlers.clear();

      // Cancel all active jobs
      this.jobs.getActiveJobs().forEach(jobId => {
        this.jobs.cancelJob(jobId);
      });
  }
}

/**
 * デフォルト設定でブローカーを作成
 */
export function createUIToolBroker(
  toolExecutor: McpToolExecutor,
  overrides: Partial<BrokerConfig> = {}
): UIToolBroker {
  const defaultConfig: BrokerConfig = {
    allowedOrigin: 'https://localhost:3000', // Will be replaced during generation
    allowedTools: [], // Will be populated during generation
    maxConcurrentJobs: 5,
    requestTimeoutMs: 30000,
    enableIdempotency: true,
    ...overrides
  };

  return new UIToolBroker(defaultConfig, toolExecutor);
}