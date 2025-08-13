/**
 * Customer Dashboard UI Tool
 * 
 * Returns UI specification with HTML content, bootstrap needs, and allowed tools
 * Implements host-mediated UI pattern with postMessage communication
 */

import { toolCategories } from '../../integration/allowlist.js';

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

export async function uiCustomerDashboard(params: UIToolParams): Promise<UIToolResult> {
  const { limit = 20 } = params;

  // UI specification with needs and allowTools
  const uiSpec = {
    uri: "ui://customer/dashboard",
    content: {
      type: "rawHtml",
      htmlString: generateDashboardHTML(limit)
    },
    needs: [
      { tool: "listCustomers", params: { limit } },
      { tool: "listRecentOrders", params: { days: 7, limit: 10 } },
      { tool: "getCustomerStats", params: {} },
      { tool: "getDashboardMetrics", params: {} }
    ],
    allowTools: [
      ...toolCategories.customers,
      ...toolCategories.orders, 
      ...toolCategories.dashboard
    ]
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

function generateDashboardHTML(limit: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Management Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
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
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .stat-card h3 {
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .stat-card .value {
            font-size: 24px;
            font-weight: 600;
            color: #0f172a;
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
            justify-content: between;
            align-items: center;
        }
        
        .results-header h2 {
            font-size: 18px;
            font-weight: 600;
        }
        
        .customer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
            padding: 20px;
        }
        
        .customer-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 16px;
            transition: all 0.2s;
        }
        
        .customer-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .customer-name {
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 4px;
        }
        
        .customer-email {
            color: #3b82f6;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .customer-meta {
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
        
        .actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        
        .btn-sm {
            padding: 4px 8px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>Customer Management Dashboard</h1>
        </div>
        
        <div id="stats" class="stats-grid">
            <div class="stat-card">
                <h3>Total Customers</h3>
                <div class="value" id="total-customers">-</div>
            </div>
            <div class="stat-card">
                <h3>Active This Month</h3>
                <div class="value" id="active-customers">-</div>
            </div>
            <div class="stat-card">
                <h3>Total Revenue</h3>
                <div class="value" id="total-revenue">-</div>
            </div>
            <div class="stat-card">
                <h3>Recent Orders</h3>
                <div class="value" id="recent-orders">-</div>
            </div>
        </div>
        
        <div class="search-section">
            <form id="search-form" class="search-form">
                <div class="form-group">
                    <label for="search-query">Search Customers</label>
                    <input type="text" id="search-query" name="query" placeholder="Name, email, or company...">
                </div>
                <div class="form-group">
                    <label for="search-limit">Limit</label>
                    <input type="number" id="search-limit" name="limit" value="20" min="1" max="100">
                </div>
                <button type="submit" class="btn btn-primary">Search</button>
                <button type="button" id="reset-btn" class="btn btn-secondary">Reset</button>
            </form>
        </div>
        
        <div class="results-section">
            <div class="results-header">
                <h2>Customers</h2>
                <button id="refresh-btn" class="btn btn-secondary">Refresh</button>
            </div>
            <div id="customers-container">
                <div class="loading">Loading customers...</div>
            </div>
        </div>
    </div>

    <script>
        // UI State Management
        class DashboardState {
            constructor() {
                this.customers = [];
                this.stats = {};
                this.loading = false;
                this.error = null;
            }
        }
        
        const state = new DashboardState();
        const ORIGIN = window.location.origin;
        
        // UI Components
        function renderCustomers(customers) {
            const container = document.getElementById('customers-container');
            
            if (!customers || customers.length === 0) {
                container.innerHTML = '<div class="empty-state">No customers found</div>';
                return;
            }
            
            const grid = document.createElement('div');
            grid.className = 'customer-grid';
            
            customers.forEach(customer => {
                const card = document.createElement('div');
                card.className = 'customer-card';
                card.innerHTML = \`
                    <div class="customer-name">\${customer.name || 'Unnamed Customer'}</div>
                    <div class="customer-email">\${customer.email || 'No email'}</div>
                    <div class="customer-meta">
                        <span>ID: \${customer.id}</span>
                        <span>\${customer.company || 'No company'}</span>
                    </div>
                    <div class="actions">
                        <button class="btn btn-sm btn-secondary" onclick="viewCustomer('\${customer.id}')">View</button>
                        <button class="btn btn-sm btn-secondary" onclick="editCustomer('\${customer.id}')">Edit</button>
                    </div>
                \`;
                grid.appendChild(card);
            });
            
            container.innerHTML = '';
            container.appendChild(grid);
        }
        
        function renderStats(stats) {
            if (stats.customerCount !== undefined) {
                document.getElementById('total-customers').textContent = stats.customerCount;
            }
            if (stats.activeCustomers !== undefined) {
                document.getElementById('active-customers').textContent = stats.activeCustomers;
            }
            if (stats.totalRevenue !== undefined) {
                document.getElementById('total-revenue').textContent = 
                    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalRevenue);
            }
            if (stats.recentOrders !== undefined) {
                document.getElementById('recent-orders').textContent = stats.recentOrders;
            }
        }
        
        function showLoading() {
            document.getElementById('customers-container').innerHTML = 
                '<div class="loading">Loading customers...</div>';
        }
        
        function showError(error) {
            const container = document.getElementById('customers-container');
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
        async function searchCustomers() {
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
                
                const result = await invokeTool('searchCustomers', params);
                state.customers = result.customers || result || [];
                renderCustomers(state.customers);
            } catch (error) {
                showError(error);
            }
        }
        
        async function refreshData() {
            showLoading();
            
            try {
                const [customers, stats] = await Promise.all([
                    invokeTool('listCustomers', { limit: ${limit} }),
                    invokeTool('getDashboardMetrics', {}).catch(() => ({}))
                ]);
                
                state.customers = customers.customers || customers || [];
                state.stats = stats || {};
                
                renderCustomers(state.customers);
                renderStats(state.stats);
            } catch (error) {
                showError(error);
            }
        }
        
        function viewCustomer(id) {
            // Future: Open customer detail view
            console.log('View customer:', id);
        }
        
        function editCustomer(id) {
            // Future: Open customer edit form  
            console.log('Edit customer:', id);
        }
        
        // Initialize Dashboard
        function initializeDashboard(bootstrapData) {
            console.log('[Dashboard] Initializing with bootstrap data:', Object.keys(bootstrapData));
            
            // Process bootstrap data
            if (bootstrapData.listCustomers) {
                state.customers = bootstrapData.listCustomers.customers || bootstrapData.listCustomers || [];
                renderCustomers(state.customers);
            }
            
            if (bootstrapData.getDashboardMetrics || bootstrapData.getCustomerStats) {
                state.stats = { ...bootstrapData.getDashboardMetrics, ...bootstrapData.getCustomerStats };
                renderStats(state.stats);
            }
            
            if (bootstrapData.listRecentOrders) {
                const recentOrders = bootstrapData.listRecentOrders.orders || bootstrapData.listRecentOrders || [];
                state.stats.recentOrders = recentOrders.length;
                renderStats(state.stats);
            }
        }
        
        // Event Listeners
        document.getElementById('search-form').addEventListener('submit', (e) => {
            e.preventDefault();
            searchCustomers();
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