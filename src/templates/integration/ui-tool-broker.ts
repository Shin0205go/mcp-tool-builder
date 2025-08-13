/**
 * UI-Tool Broker for Host-mediated UI Integration
 * 
 * Provides secure communication between UI components and MCP tools
 * Features: Origin verification, Tool allowlist, Idempotency, Error handling
 */

import { allowedTools } from './allowlist.js';

// Message types for UI-Tool communication
interface McpToolInvokeMessage {
  type: 'mcp:tool.invoke';
  requestId: string;
  tool: string;
  params: Record<string, any>;
}

interface McpToolResultMessage {
  type: 'mcp:tool.result';
  requestId: string;
  result: any;
}

interface McpToolErrorMessage {
  type: 'mcp:tool.error';
  requestId: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

type McpMessage = McpToolInvokeMessage | McpToolResultMessage | McpToolErrorMessage;

// Tool execution function type
type ToolExecutor = (tool: string, params: Record<string, any>, options: { idempotencyKey?: string }) => Promise<any>;

export class UIToolBroker {
  private iframe: HTMLIFrameElement | null = null;
  private toolExecutor: ToolExecutor | null = null;
  private uiOrigin: string;
  private executionLog = new Map<string, any>(); // Simple idempotency cache

  constructor(uiOrigin: string) {
    if (!uiOrigin) {
      throw new Error('UI origin is required for secure communication');
    }
    this.uiOrigin = uiOrigin;
    console.log(`[UIToolBroker] Initialized with origin: ${uiOrigin}`);
  }

  /**
   * Attach broker to iframe with tool executor
   */
  attachToIframe(iframe: HTMLIFrameElement, toolExecutor: ToolExecutor): void {
    this.iframe = iframe;
    this.toolExecutor = toolExecutor;

    // Setup message listener for secure communication
    window.addEventListener('message', this.handleMessage.bind(this));

    console.log('[UIToolBroker] Attached to iframe with tool executor');
  }

  /**
   * Handle incoming messages from UI
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      // Step 1: Origin verification
      if (event.origin !== this.uiOrigin) {
        console.warn(`[UIToolBroker] Rejected message from unauthorized origin: ${event.origin} (expected: ${this.uiOrigin})`);
        return;
      }

      // Step 2: Message validation
      const message = event.data as McpMessage;
      if (!this.isValidMcpMessage(message)) {
        console.warn('[UIToolBroker] Received invalid MCP message:', message);
        return;
      }

      // Step 3: Handle tool invocation
      if (message.type === 'mcp:tool.invoke') {
        await this.handleToolInvocation(message);
      }

    } catch (error) {
      console.error('[UIToolBroker] Error handling message:', error);
    }
  }

  /**
   * Handle tool invocation with security checks
   */
  private async handleToolInvocation(message: McpToolInvokeMessage): Promise<void> {
    const { requestId, tool, params } = message;

    try {
      // Step 1: Tool allowlist validation
      if (!allowedTools.includes(tool as any)) {
        await this.sendError(requestId, {
          code: 'TOOL_NOT_ALLOWED',
          message: `Tool '${tool}' is not allowed for UI execution`,
          details: { allowedTools }
        });
        return;
      }

      // Step 2: Idempotency check
      if (this.executionLog.has(requestId)) {
        console.log(`[UIToolBroker] Returning cached result for requestId: ${requestId}`);
        await this.sendResult(requestId, this.executionLog.get(requestId));
        return;
      }

      // Step 3: Tool execution
      if (!this.toolExecutor) {
        throw new Error('Tool executor not initialized');
      }

      console.log(`[UIToolBroker] Executing tool: ${tool} with params:`, params);
      
      const result = await this.toolExecutor(tool, params, {
        idempotencyKey: requestId
      });

      // Step 4: Cache and return result
      this.executionLog.set(requestId, result);
      await this.sendResult(requestId, result);

    } catch (error) {
      console.error(`[UIToolBroker] Tool execution failed for ${tool}:`, error);
      await this.sendError(requestId, {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: { tool, params }
      });
    }
  }

  /**
   * Send result back to UI
   */
  private async sendResult(requestId: string, result: any): Promise<void> {
    if (!this.iframe?.contentWindow) {
      console.error('[UIToolBroker] Cannot send result - iframe not available');
      return;
    }

    const message: McpToolResultMessage = {
      type: 'mcp:tool.result',
      requestId,
      result
    };

    this.iframe.contentWindow.postMessage(message, this.uiOrigin);
    console.log(`[UIToolBroker] Sent result for requestId: ${requestId}`);
  }

  /**
   * Send error back to UI
   */
  private async sendError(requestId: string, error: { code: string; message: string; details?: any }): Promise<void> {
    if (!this.iframe?.contentWindow) {
      console.error('[UIToolBroker] Cannot send error - iframe not available');
      return;
    }

    const message: McpToolErrorMessage = {
      type: 'mcp:tool.error',
      requestId,
      error
    };

    this.iframe.contentWindow.postMessage(message, this.uiOrigin);
    console.log(`[UIToolBroker] Sent error for requestId: ${requestId}`, error);
  }

  /**
   * Validate MCP message structure
   */
  private isValidMcpMessage(message: any): message is McpMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const { type, requestId } = message;
    
    if (!type || !requestId) {
      return false;
    }

    switch (type) {
      case 'mcp:tool.invoke':
        return typeof message.tool === 'string' && 
               typeof message.params === 'object';
      case 'mcp:tool.result':
      case 'mcp:tool.error':
        return true;
      default:
        return false;
    }
  }

  /**
   * Send bootstrap data to UI after initial load
   */
  async sendBootstrap(initialData: Record<string, any>): Promise<void> {
    if (!this.iframe?.contentWindow) {
      console.error('[UIToolBroker] Cannot send bootstrap - iframe not available');
      return;
    }

    const message = {
      type: 'mcp:bootstrap',
      data: initialData
    };

    this.iframe.contentWindow.postMessage(message, this.uiOrigin);
    console.log('[UIToolBroker] Sent bootstrap data:', Object.keys(initialData));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    window.removeEventListener('message', this.handleMessage.bind(this));
    this.iframe = null;
    this.toolExecutor = null;
    this.executionLog.clear();
    console.log('[UIToolBroker] Destroyed');
  }
}

// Factory function for easy initialization
export function createUIToolBroker(uiOrigin: string): UIToolBroker {
  return new UIToolBroker(uiOrigin);
}

// Export types for external use
export type { McpToolInvokeMessage, McpToolResultMessage, McpToolErrorMessage, ToolExecutor };