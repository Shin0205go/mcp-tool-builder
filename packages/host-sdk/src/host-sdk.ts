/**
 * MCP Host SDK
 * 
 * Provides secure mounting and communication bridge between
 * MCP-generated UI components and MCP tools.
 * 
 * Security model:
 * - Fixed origin validation for all postMessage communication
 * - Tool allowlist enforcement
 * - Request timeout protection
 * - Audit logging with unique request IDs
 */

export type CallTool = (name: string, args: any) => Promise<any>;
export type ReadResource = (uri: string) => Promise<{ html: string }>;

export type MountUiOptions = {
  el: HTMLElement | string;
  uri: string;                          // e.g. "ui://customer/dashboard"
  needs?: { tool: string; params?: any }[];
  allowTools?: string[];                // Tools allowed by broker
  origin: string;                       // e.g. window.location.origin
  callTool: CallTool;                   // MCP tool invocation
  readResource: ReadResource;           // MCP resource reading
  timeoutMs?: number;                   // Invoke timeout limit
};

export type UiMessage =
  | { type: 'mcp:ui.ready' }
  | { type: 'mcp:tool.invoke'; requestId: string; tool: string; params?: any }
  | { type: 'mcp:log'; level: 'info' | 'warn' | 'error'; message: string };

export type HostMessage =
  | { type: 'mcp:bootstrap'; data: Record<string, unknown> }
  | { type: 'mcp:tool.result'; requestId: string; result: any }
  | { type: 'mcp:tool.error'; requestId: string; error: string };

/**
 * Mount a MCP UI component into the DOM
 * 
 * 1. Fetches UI resource HTML
 * 2. Creates sandboxed iframe
 * 3. Resolves initial data needs
 * 4. Attaches communication broker
 * 5. Sends bootstrap data when UI is ready
 */
export async function mountUi(opts: MountUiOptions) {
  const el = typeof opts.el === 'string' ? document.querySelector(opts.el)! : opts.el;
  if (!el) throw new Error('mountUi: container not found');

  // 1) Fetch UI resource and display in iframe
  const { html } = await opts.readResource(opts.uri);
  const iframe = document.createElement('iframe');
  
  // Security: Minimal sandbox permissions
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms');
  iframe.style.width = '100%';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  el.innerHTML = '';
  el.appendChild(iframe);

  // Use srcdoc for inline HTML (avoids cross-origin issues)
  iframe.srcdoc = html;

  // 2) Resolve needs in parallel
  const needs = opts.needs ?? [];
  const initData: Record<string, unknown> = {};
  
  await Promise.all(needs.map(async (n) => {
    try {
      const key = n.tool;
      initData[key] = await opts.callTool(n.tool, n.params ?? {});
    } catch (error) {
      console.error(`Failed to resolve need ${n.tool}:`, error);
      initData[n.tool] = { error: String(error) };
    }
  }));

  // 3) Attach broker for invoke mediation
  const detachBroker = attachBroker({
    iframe,
    origin: opts.origin,
    callTool: opts.callTool,
    allowTools: opts.allowTools ?? [],
    timeoutMs: opts.timeoutMs ?? 15000
  });

  // 4) Send bootstrap when iframe is ready
  const onReady = (ev: MessageEvent) => {
    // Security: Strict origin validation
    if (ev.origin !== opts.origin && ev.origin !== 'null') return; // srcdoc origin is 'null'
    
    const msg = ev.data as UiMessage;
    if (msg?.type === 'mcp:ui.ready') {
      const out: HostMessage = { type: 'mcp:bootstrap', data: initData };
      iframe.contentWindow?.postMessage(out, '*'); // srcdoc requires '*'
      window.removeEventListener('message', onReady);
    }
  };
  window.addEventListener('message', onReady);

  return { 
    iframe,
    cleanup: () => {
      detachBroker();
      window.removeEventListener('message', onReady);
      el.innerHTML = '';
    }
  };
}

/**
 * Attach communication broker between UI and MCP tools
 * 
 * Security features:
 * - Origin validation
 * - Tool allowlist enforcement  
 * - Request timeout
 * - Audit logging
 */
export function attachBroker(args: {
  iframe: HTMLIFrameElement;
  origin: string;
  callTool: CallTool;
  allowTools: string[];
  timeoutMs: number;
}) {
  const { iframe, origin, callTool, allowTools, timeoutMs } = args;

  const handler = async (ev: MessageEvent) => {
    // Security: Validate source
    if (ev.source !== iframe.contentWindow) return;
    
    // srcdoc iframes have 'null' origin
    if (ev.origin !== origin && ev.origin !== 'null') return;
    
    const msg = ev.data as UiMessage;
    if (!msg || msg.type !== 'mcp:tool.invoke') return;

    const { requestId, tool, params } = msg;
    
    // Security: Tool allowlist check
    if (!allowTools.includes(tool)) {
      const out: HostMessage = { 
        type: 'mcp:tool.error', 
        requestId, 
        error: `Tool not allowed: ${tool}` 
      };
      iframe.contentWindow?.postMessage(out, '*');
      console.warn(`[broker] Rejected disallowed tool: ${tool}`);
      return;
    }

    // Audit logging setup
    const started = Date.now();
    const auditId = crypto.randomUUID();
    
    console.info('[broker] Starting', { 
      auditId, 
      requestId, 
      tool, 
      hasParams: !!params 
    });

    // Setup timeout protection
    const run = callTool(tool, params ?? {});
    const timer = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Tool timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    try {
      const result = await Promise.race([run, timer]);
      const out: HostMessage = { 
        type: 'mcp:tool.result', 
        requestId, 
        result 
      };
      iframe.contentWindow?.postMessage(out, '*');
      
      console.info('[broker] Success', { 
        auditId, 
        tool, 
        ms: Date.now() - started 
      });
    } catch (e: any) {
      const errorMessage = e?.message || String(e);
      const out: HostMessage = { 
        type: 'mcp:tool.error', 
        requestId, 
        error: errorMessage 
      };
      iframe.contentWindow?.postMessage(out, '*');
      
      console.warn('[broker] Failed', { 
        auditId, 
        tool, 
        ms: Date.now() - started, 
        error: errorMessage 
      });
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

/**
 * Example HTTP-based MCP tool caller
 * Proxies JSON-RPC calls to MCP server through a backend endpoint
 */
export async function callToolHttp(name: string, args: any): Promise<any> {
  const response = await fetch('/mcp-proxy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ 
      jsonrpc: '2.0', 
      id: crypto.randomUUID(), 
      method: 'tools/call', 
      params: { name, arguments: args } 
    })
  });
  
  if (!response.ok) {
    throw new Error(`MCP proxy error: ${response.status}`);
  }
  
  const json = await response.json();
  
  // Handle JSON-RPC error
  if (json.error) {
    throw new Error(json.error.message || 'MCP call failed');
  }
  
  // Extract result from MCP response format
  const content = json?.result?.content;
  if (!content || !Array.isArray(content)) {
    throw new Error('Invalid MCP response format');
  }
  
  // Find JSON content type
  const jsonContent = content.find((c: any) => c.type === 'text');
  if (!jsonContent) {
    throw new Error('No text content in MCP response');
  }
  
  // Parse the JSON result
  try {
    return JSON.parse(jsonContent.text);
  } catch {
    // If not JSON, return as-is
    return jsonContent.text;
  }
}

/**
 * Example HTTP-based MCP resource reader
 * Fetches UI resources through a backend proxy
 */
export async function readResourceHttp(uri: string): Promise<{ html: string }> {
  const response = await fetch('/mcp-proxy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ 
      jsonrpc: '2.0', 
      id: crypto.randomUUID(), 
      method: 'resources/read', 
      params: { uri } 
    })
  });
  
  if (!response.ok) {
    throw new Error(`MCP proxy error: ${response.status}`);
  }
  
  const json = await response.json();
  
  // Handle JSON-RPC error
  if (json.error) {
    throw new Error(json.error.message || 'Resource read failed');
  }
  
  // Extract HTML from response
  const text = json?.result?.contents?.[0]?.text;
  if (!text) {
    throw new Error(`Resource not found: ${uri}`);
  }
  
  return { html: text as string };
}