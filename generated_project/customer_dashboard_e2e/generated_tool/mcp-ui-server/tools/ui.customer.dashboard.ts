/**
 * Item Dashboard UI Tool
 * 
 * Returns UI specification with HTML content, bootstrap needs, and allowed tools
 * Generated for generated_tool
 */

import { allowedTools } from '../../integration/allowlist.js';

interface UIToolParams {
  limit?: number;
  preset?: string;
}

interface UIToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

export async function uiItemDashboard(params: UIToolParams): Promise<UIToolResult> {
  const { limit = 20 } = params;

  // UI specification with needs and allowTools
  const uiSpec = {
    uri: "ui://item/dashboard",
    content: {
      type: "rawHtml",
      htmlString: generateDashboardHTML(limit, 'Item', 'generated-tool')
    },
    needs: [
      { tool: "listItems", params: { limit } }
    ],
    allowTools: allowedTools
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(uiSpec, null, 2)
      }
    ]
  };
}

function generateDashboardHTML(limit: number, entityName: string, toolName: string): string {
  const entityLower = entityName.toLowerCase();
  const entityPlural = entityName.endsWith('s') ? entityName : entityName + 's';
  const entityPluralLower = entityPlural.toLowerCase();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${entityName} Management Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        
        .header h1 {
            color: #0f172a;
            font-size: 24px;
            font-weight: 600;
        }
        
        .search-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        
        .search-form {
            display: flex;
            gap: 12px;
            align-items: end;
        }
        
        .form-group {
            flex: 1;
        }
        
        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 4px;
        }
        
        .form-group input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
        }
        
        .btn-secondary {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
        }
        
        .btn-secondary:hover {
            background: #e2e8f0;
        }
        
        .results-section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .results-header {
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .results-header h2 {
            font-size: 18px;
            font-weight: 600;
        }
        
        .item-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
            padding: 20px;
        }
        
        .item-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 16px;
            transition: all 0.2s;
        }
        
        .item-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .item-title {
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 4px;
        }
        
        .item-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #64748b;
        }
        
        .loading {
            padding: 40px;
            text-align: center;
            color: #64748b;
        }
        
        .error {
            padding: 20px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            color: #dc2626;
            margin-bottom: 20px;
        }
        
        .empty-state {
            padding: 40px;
            text-align: center;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>${entityName} Management Dashboard</h1>
        </div>
        
        <div class="search-section">
            <form id="search-form" class="search-form">
                <div class="form-group">
                    <label for="search-query">Search ${entityPlural}</label>
                    <input type="text" id="search-query" name="query" placeholder="Search...">
                </div>
                <div class="form-group">
                    <label for="search-limit">Limit</label>
                    <input type="number" id="search-limit" name="limit" value="${limit}" min="1" max="100">
                </div>
                <button type="submit" class="btn btn-primary">Search</button>
                <button type="button" id="reset-btn" class="btn btn-secondary">Reset</button>
            </form>
        </div>
        
        <div class="results-section">
            <div class="results-header">
                <h2>${entityPlural}</h2>
                <button id="refresh-btn" class="btn btn-secondary">Refresh</button>
            </div>
            <div id="items-container">
                <div class="loading">Loading ${entityPluralLower}...</div>
            </div>
        </div>
    </div>

    <script>
        const ORIGIN = window.location.origin;
        
        // Render items
        function renderItems(items) {
            const container = document.getElementById('items-container');
            
            if (!items || items.length === 0) {
                container.innerHTML = '<div class="empty-state">No ${entityPluralLower} found</div>';
                return;
            }
            
            const grid = document.createElement('div');
            grid.className = 'item-grid';
            
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card';
                card.innerHTML = \`
                    <div class="item-title">\${item.name || item.title || 'Untitled'}</div>
                    <div class="item-meta">
                        <span>ID: \${item.id}</span>
                        <span>\${new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                \`;
                grid.appendChild(card);
            });
            
            container.innerHTML = '';
            container.appendChild(grid);
        }
        
        function showLoading() {
            document.getElementById('items-container').innerHTML = 
                '<div class="loading">Loading ${entityPluralLower}...</div>';
        }
        
        function showError(error) {
            const container = document.getElementById('items-container');
            container.innerHTML = \`
                <div class="error">
                    <strong>Error:</strong> \${error.message || 'An unexpected error occurred'}
                </div>
            \`;
        }
        
        // MCP Tool Communication
        function invokeTool(tool, params = {}) {
            const requestId = crypto.randomUUID();
            
            console.log(\`[Dashboard] Invoking tool: \${tool}\`, params);
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(\`Tool \${tool} timed out\`));
                }, 30000);
                
                function handleResult(event) {
                    if (event.data.requestId === requestId) {
                        clearTimeout(timeout);
                        window.removeEventListener('message', handleResult);
                        
                        if (event.data.type === 'mcp:tool.result') {
                            resolve(event.data.result);
                        } else if (event.data.type === 'mcp:tool.error') {
                            reject(new Error(event.data.error.message));
                        }
                    }
                }
                
                window.addEventListener('message', handleResult);
                
                window.parent.postMessage({
                    type: 'mcp:tool.invoke',
                    requestId,
                    tool,
                    params
                }, ORIGIN);
            });
        }
        
        // Event Handlers
        async function search${entityPlural}() {
            const form = document.getElementById('search-form');
            const formData = new FormData(form);
            const query = formData.get('query');
            const limit = parseInt(formData.get('limit')) || 20;
            
            showLoading();
            
            try {
                const params = { limit };
                if (query) {
                    params.query = query;
                }
                
                const result = await invokeTool('search${entityPlural}', params);
                const items = result.items || result.\${entityPluralLower} || result || [];
                renderItems(items);
            } catch (error) {
                showError(error);
            }
        }
        
        async function refreshData() {
            showLoading();
            
            try {
                const result = await invokeTool('list${entityPlural}', { limit: \${limit} });
                const items = result.items || result.\${entityPluralLower} || result || [];
                renderItems(items);
            } catch (error) {
                showError(error);
            }
        }
        
        // Initialize Dashboard
        function initializeDashboard(bootstrapData) {
            console.log('[Dashboard] Initializing with bootstrap data:', Object.keys(bootstrapData));
            
            if (bootstrapData['list\${entityPlural}']) {
                const data = bootstrapData['list\${entityPlural}'];
                const items = data.items || data.\${entityPluralLower} || data || [];
                renderItems(items);
            }
        }
        
        // Event Listeners
        document.getElementById('search-form').addEventListener('submit', (e) => {
            e.preventDefault();
            search${entityPlural}();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            document.getElementById('search-form').reset();
            refreshData();
        });
        
        document.getElementById('refresh-btn').addEventListener('click', refreshData);
        
        // Bootstrap listener
        window.addEventListener('message', (event) => {
            if (event.data.type === 'mcp:bootstrap') {
                initializeDashboard(event.data.data);
            }
        });
        
        console.log('[Dashboard] UI initialized, waiting for bootstrap data...');
    </script>
</body>
</html>`;
}