/**
 * Host Embed Helper
 * 
 * Provides easy integration for chat UI hosts to embed MCP UI components
 * Handles needs bootstrapping, iframe management, and tool brokering
 */

import { createUIToolBroker, type ToolExecutor } from '../integration/ui-tool-broker.js';

interface McpClient {
  call(tool: string, params: Record<string, any>, options?: { idempotencyKey?: string }): Promise<any>;
}

interface UISpec {
  uri: string;
  content: {
    type: "rawHtml";
    htmlString: string;
  };
  needs: Array<{
    tool: string;
    params: Record<string, any>;
  }>;
  allowTools: string[];
}

interface EmbedOptions {
  container: HTMLElement;
  uiOrigin: string;
  mcpClient: McpClient;
  onError?: (error: Error) => void;
  onLoaded?: () => void;
}

export class MCPUIEmbed {
  private container: HTMLElement;
  private iframe: HTMLIFrameElement | null = null;
  private broker: ReturnType<typeof createUIToolBroker> | null = null;
  private mcpClient: McpClient;
  private uiOrigin: string;
  private onError?: (error: Error) => void;
  private onLoaded?: () => void;

  constructor(options: EmbedOptions) {
    this.container = options.container;
    this.uiOrigin = options.uiOrigin;
    this.mcpClient = options.mcpClient;
    this.onError = options.onError;
    this.onLoaded = options.onLoaded;
  }

  /**
   * Load and embed a UI component
   */
  async loadUI(uiTool: string, params: Record<string, any> = {}): Promise<void> {
    try {
      console.log(`[MCPUIEmbed] Loading UI tool: ${uiTool}`);

      // Step 1: Get UI specification from UI server
      const uiSpecResult = await this.mcpClient.call(uiTool, params);
      const uiSpec = this.parseUISpec(uiSpecResult);

      console.log(`[MCPUIEmbed] UI spec loaded:`, {
        uri: uiSpec.uri,
        needsCount: uiSpec.needs.length,
        allowToolsCount: uiSpec.allowTools.length
      });

      // Step 2: Execute needs to get initial data
      const initialData = await this.executeNeeds(uiSpec.needs);

      console.log(`[MCPUIEmbed] Bootstrap data prepared:`, Object.keys(initialData));

      // Step 3: Create and setup iframe
      await this.createIframe(uiSpec.content.htmlString);

      // Step 4: Setup tool broker
      this.setupBroker();

      // Step 5: Send bootstrap data once iframe is loaded
      await this.waitForIframeLoad();
      await this.broker?.sendBootstrap(initialData);

      console.log(`[MCPUIEmbed] UI embedded successfully`);
      this.onLoaded?.();

    } catch (error) {
      console.error('[MCPUIEmbed] Failed to load UI:', error);
      this.handleError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Parse UI specification from MCP tool result
   */
  private parseUISpec(result: any): UISpec {
    try {
      // Handle different result formats
      let specText: string;
      
      if (typeof result === 'string') {
        specText = result;
      } else if (result.content && Array.isArray(result.content)) {
        specText = result.content[0]?.text || '';
      } else if (result.text) {
        specText = result.text;
      } else {
        throw new Error('Invalid UI specification format');
      }

      const spec = JSON.parse(specText);
      
      // Validate required fields
      if (!spec.content?.htmlString) {
        throw new Error('UI specification missing HTML content');
      }
      
      return {
        uri: spec.uri || 'ui://unknown',
        content: spec.content,
        needs: spec.needs || [],
        allowTools: spec.allowTools || []
      };
    } catch (error) {
      throw new Error(`Failed to parse UI specification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute needs to get initial bootstrap data
   */
  private async executeNeeds(needs: UISpec['needs']): Promise<Record<string, any>> {
    const initialData: Record<string, any> = {};

    if (needs.length === 0) {
      return initialData;
    }

    console.log(`[MCPUIEmbed] Executing ${needs.length} needs...`);

    // Execute needs in parallel for better performance
    const needPromises = needs.map(async (need) => {
      try {
        console.log(`[MCPUIEmbed] Executing need: ${need.tool}`, need.params);
        const result = await this.mcpClient.call(need.tool, need.params);
        return { tool: need.tool, result };
      } catch (error) {
        console.warn(`[MCPUIEmbed] Need failed: ${need.tool}`, error);
        return { tool: need.tool, result: null, error };
      }
    });

    const needResults = await Promise.all(needPromises);

    // Collect results
    for (const { tool, result, error } of needResults) {
      if (result !== null) {
        initialData[tool] = result;
      } else if (error) {
        console.warn(`[MCPUIEmbed] Need '${tool}' failed:`, error);
        // Continue with other needs even if some fail
      }
    }

    console.log(`[MCPUIEmbed] Needs execution completed:`, Object.keys(initialData));
    return initialData;
  }

  /**
   * Create iframe with UI content
   */
  private async createIframe(htmlContent: string): Promise<void> {
    // Clear container
    this.container.innerHTML = '';

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.style.borderRadius = '8px';
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    
    // Create blob URL for iframe content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    this.iframe.src = blobUrl;

    // Add to container
    this.container.appendChild(this.iframe);

    // Cleanup blob URL after load
    this.iframe.addEventListener('load', () => {
      URL.revokeObjectURL(blobUrl);
    });
  }

  /**
   * Setup tool broker for iframe communication
   */
  private setupBroker(): void {
    if (!this.iframe) {
      throw new Error('Cannot setup broker: iframe not created');
    }

    this.broker = createUIToolBroker(this.uiOrigin);

    // Create tool executor that uses MCP client
    const toolExecutor: ToolExecutor = async (tool, params, options) => {
      console.log(`[MCPUIEmbed] Executing tool via broker: ${tool}`, params);
      return await this.mcpClient.call(tool, params, options);
    };

    this.broker.attachToIframe(this.iframe, toolExecutor);
  }

  /**
   * Wait for iframe to load completely
   */
  private async waitForIframeLoad(): Promise<void> {
    if (!this.iframe) {
      throw new Error('Iframe not available');
    }

    return new Promise((resolve, reject) => {
      if (this.iframe!.contentDocument?.readyState === 'complete') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Iframe load timeout'));
      }, 10000);

      this.iframe!.addEventListener('load', () => {
        clearTimeout(timeout);
        // Additional delay to ensure scripts are initialized
        setTimeout(resolve, 100);
      });
    });
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('[MCPUIEmbed] Error:', error);
    
    // Show error in container
    this.container.innerHTML = `
      <div style="
        padding: 20px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #dc2626;
        text-align: center;
      ">
        <strong>Error loading UI:</strong><br>
        ${error.message}
      </div>
    `;

    this.onError?.(error);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.broker) {
      this.broker.destroy();
      this.broker = null;
    }
    
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    
    this.container.innerHTML = '';
    console.log('[MCPUIEmbed] Destroyed');
  }
}

/**
 * Convenience function to quickly embed a UI
 */
export async function embedMCPUI(options: EmbedOptions & { uiTool: string; params?: Record<string, any> }): Promise<MCPUIEmbed> {
  const embed = new MCPUIEmbed(options);
  await embed.loadUI(options.uiTool, options.params || {});
  return embed;
}

// Export types for external use
export type { McpClient, UISpec, EmbedOptions };