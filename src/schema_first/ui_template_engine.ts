import { Entity, GeneratedTool } from '../types/index.js';
import { SchemaFirstGenerator } from './schema_generator.js';

export interface UIComponentTemplate {
  name: string;
  type: 'form' | 'list' | 'dashboard' | 'search' | 'detail';
  htmlTemplate: string;
  requiredTools: string[];
}

export interface UIGenerationOptions {
  origin: string;
  theme: 'default' | 'minimal' | 'bootstrap';
  enableRealtime: boolean;
  enableExport: boolean;
}

/**
 * UI Template Engine - Schema-first approach
 * 単一スキーマから一貫したUIを自動生成
 */
export class UITemplateEngine {
  private schemaGenerator = new SchemaFirstGenerator();

  /**
   * エンティティから全UIコンポーネントを生成
   */
  generateAllUIComponents(
    entity: Entity, 
    options: UIGenerationOptions
  ): UIComponentTemplate[] {
    const components: UIComponentTemplate[] = [];
    
    // 基本CRUD UIを生成
    components.push(this.generateCreateForm(entity, options));
    components.push(this.generateEditForm(entity, options));
    components.push(this.generateListView(entity, options));
    components.push(this.generateDetailView(entity, options));
    
    // 検索可能フィールドがある場合は検索UIを生成
    const searchableFields = entity.fields.filter(f => f.type === 'string');
    if (searchableFields.length > 0) {
      components.push(this.generateSearchView(entity, options));
    }
    
    // ダッシュボードを生成（エンティティに数値フィールドがある場合）
    const numericFields = entity.fields.filter(f => f.type === 'number');
    if (numericFields.length > 0) {
      components.push(this.generateDashboard(entity, options));
    }
    
    return components;
  }

  /**
   * 作成フォームを生成
   */
  private generateCreateForm(entity: Entity, options: UIGenerationOptions): UIComponentTemplate {
    const entityName = entity.name;
    const entityLower = entity.name.toLowerCase();
    
    const htmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>Create ${entityName}</title>
  ${this.getStyleIncludes(options.theme)}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Create New ${entityName}</h1>
      <button class="back-btn" onclick="history.back()">← Back</button>
    </div>
    
    <form id="createForm" class="entity-form">
${entity.fields.map(field => this.generateFormField(field, false, options)).join('\n')}
      
      <div class="form-actions">
        <button type="submit" class="btn-primary" id="submitBtn">
          Create ${entityName}
        </button>
        <button type="reset" class="btn-secondary">Reset</button>
      </div>
    </form>
    
    <div id="status" class="status-message"></div>
  </div>
  
  ${this.generateFormScript('create', entityName, options)}
</body>
</html>`;

    return {
      name: `${entityLower}-create-form`,
      type: 'form',
      htmlTemplate,
      requiredTools: [`create${entityName}`]
    };
  }

  /**
   * 編集フォームを生成
   */
  private generateEditForm(entity: Entity, options: UIGenerationOptions): UIComponentTemplate {
    const entityName = entity.name;
    const entityLower = entity.name.toLowerCase();
    
    const htmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>Edit ${entityName}</title>
  ${this.getStyleIncludes(options.theme)}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Edit ${entityName}</h1>
      <button class="back-btn" onclick="history.back()">← Back</button>
    </div>
    
    <form id="editForm" class="entity-form">
      <input type="hidden" name="id" id="entityId" required />
      
${entity.fields.map(field => this.generateFormField(field, true, options)).join('\n')}
      
      <div class="form-actions">
        <button type="submit" class="btn-primary" id="submitBtn">
          Update ${entityName}
        </button>
        <button type="button" class="btn-danger" id="deleteBtn">
          Delete ${entityName}
        </button>
      </div>
    </form>
    
    <div id="status" class="status-message"></div>
  </div>
  
  ${this.generateFormScript('update', entityName, options)}
</body>
</html>`;

    return {
      name: `${entityLower}-edit-form`,
      type: 'form',
      htmlTemplate,
      requiredTools: [`update${entityName}`, `delete${entityName}`]
    };
  }

  /**
   * 一覧表示を生成
   */
  private generateListView(entity: Entity, options: UIGenerationOptions): UIComponentTemplate {
    const entityName = entity.name;
    const entityLower = entity.name.toLowerCase();
    
    const htmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${entityName} List</title>
  ${this.getStyleIncludes(options.theme)}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${entityName} Management</h1>
      <div class="header-actions">
        <button class="btn-primary" onclick="showCreateForm()">
          + New ${entityName}
        </button>
        ${options.enableExport ? `<button class="btn-secondary" onclick="exportData()">Export</button>` : ''}
      </div>
    </div>
    
    <!-- Filters -->
    <div class="filters">
      <div class="filter-row">
        <input type="text" id="searchQuery" placeholder="Search..." />
        <select id="sortBy">
          <option value="createdAt">Created Date</option>
${entity.fields.filter(f => ['string', 'number', 'date'].includes(f.type))
             .map(f => `          <option value="${f.name}">${this.fieldNameToLabel(f.name)}</option>`)
             .join('\n')}
        </select>
        <select id="sortOrder">
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
        <button onclick="loadData()" class="btn-secondary">Filter</button>
      </div>
    </div>
    
    <!-- Data Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
${entity.fields.slice(0, 5).map(f => `            <th>${this.fieldNameToLabel(f.name)}</th>`).join('\n')}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="dataTableBody">
          <!-- Data will be loaded here -->
        </tbody>
      </table>
    </div>
    
    <!-- Pagination -->
    <div class="pagination" id="pagination">
      <!-- Pagination controls will be generated here -->
    </div>
    
    <div id="status" class="status-message"></div>
  </div>
  
  ${this.generateListScript(entity, options)}
</body>
</html>`;

    return {
      name: `${entityLower}-list-view`,
      type: 'list',
      htmlTemplate,
      requiredTools: [`list${entityName}`, `delete${entityName}`]
    };
  }

  /**
   * 詳細表示を生成
   */
  private generateDetailView(entity: Entity, options: UIGenerationOptions): UIComponentTemplate {
    const entityName = entity.name;
    const entityLower = entity.name.toLowerCase();
    
    const htmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${entityName} Details</title>
  ${this.getStyleIncludes(options.theme)}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${entityName} Details</h1>
      <div class="header-actions">
        <button class="btn-primary" onclick="editEntity()">Edit</button>
        <button class="back-btn" onclick="history.back()">← Back</button>
      </div>
    </div>
    
    <div class="detail-view" id="detailContent">
      <!-- Content will be loaded here -->
    </div>
    
    <div id="status" class="status-message"></div>
  </div>
  
  ${this.generateDetailScript(entity, options)}
</body>
</html>`;

    return {
      name: `${entityLower}-detail-view`,
      type: 'detail',
      htmlTemplate,
      requiredTools: [`get${entityName}ById`]
    };
  }

  /**
   * 検索画面を生成
   */
  private generateSearchView(entity: Entity, options: UIGenerationOptions): UIComponentTemplate {
    const entityName = entity.name;
    const entityLower = entity.name.toLowerCase();
    
    const searchableFields = entity.fields.filter(f => f.type === 'string');
    
    const htmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>Search ${entityName}</title>
  ${this.getStyleIncludes(options.theme)}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Search ${entityName}</h1>
    </div>
    
    <div class="search-form">
      <div class="search-row">
        <input type="text" id="searchQuery" placeholder="Enter search terms..." />
        <div class="search-fields">
          <label>Search in:</label>
${searchableFields.map(field => `          <label><input type="checkbox" name="searchFields" value="${field.name}" checked> ${this.fieldNameToLabel(field.name)}</label>`).join('\n')}
        </div>
        <button onclick="performSearch()" class="btn-primary">Search</button>
      </div>
    </div>
    
    <div class="search-results" id="searchResults">
      <!-- Results will be shown here -->
    </div>
    
    <div id="status" class="status-message"></div>
  </div>
  
  ${this.generateSearchScript(entity, options)}
</body>
</html>`;

    return {
      name: `${entityLower}-search-view`,
      type: 'search',
      htmlTemplate,
      requiredTools: [`search${entityName}`]
    };
  }

  /**
   * ダッシュボードを生成
   */
  private generateDashboard(entity: Entity, options: UIGenerationOptions): UIComponentTemplate {
    const entityName = entity.name;
    const entityLower = entity.name.toLowerCase();
    
    const numericFields = entity.fields.filter(f => f.type === 'number');
    
    const htmlTemplate = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${entityName} Dashboard</title>
  ${this.getStyleIncludes(options.theme)}
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${entityName} Dashboard</h1>
      <div class="header-actions">
        <button onclick="refreshDashboard()" class="btn-secondary">Refresh</button>
      </div>
    </div>
    
    <div class="dashboard-grid">
      <!-- KPI Cards -->
      <div class="kpi-cards">
        <div class="kpi-card">
          <h3>Total ${entityName}s</h3>
          <div class="kpi-value" id="totalCount">-</div>
        </div>
        
${numericFields.slice(0, 3).map(field => `        <div class="kpi-card">
          <h3>Avg ${this.fieldNameToLabel(field.name)}</h3>
          <div class="kpi-value" id="avg${field.name}">-</div>
        </div>`).join('\n')}
      </div>
      
      <!-- Charts -->
      <div class="chart-container">
        <canvas id="trendChart" width="400" height="200"></canvas>
      </div>
      
      <!-- Recent Items -->
      <div class="recent-items">
        <h3>Recent ${entityName}s</h3>
        <div id="recentList">
          <!-- Recent items will be loaded here -->
        </div>
      </div>
    </div>
    
    <div id="status" class="status-message"></div>
  </div>
  
  ${this.generateDashboardScript(entity, options)}
</body>
</html>`;

    return {
      name: `${entityLower}-dashboard`,
      type: 'dashboard',
      htmlTemplate,
      requiredTools: [`list${entityName}`, `get${entityName}Stats`]
    };
  }

  /**
   * フォームフィールドHTMLを生成
   */
  private generateFormField(field: any, isEdit: boolean, options: UIGenerationOptions): string {
    const required = field.required && !isEdit ? 'required' : '';
    const label = this.fieldNameToLabel(field.name);
    const fieldId = `field_${field.name}`;
    
    let inputElement = '';
    
    switch (field.type) {
      case 'string':
        if (field.name === 'email') {
          inputElement = `<input type="email" id="${fieldId}" name="${field.name}" class="form-input" ${required} />`;
        } else if (field.name.includes('phone')) {
          inputElement = `<input type="tel" id="${fieldId}" name="${field.name}" class="form-input" ${required} />`;
        } else if (field.name === 'description' || field.name.includes('note')) {
          inputElement = `<textarea id="${fieldId}" name="${field.name}" class="form-textarea" rows="4" ${required}></textarea>`;
        } else {
          inputElement = `<input type="text" id="${fieldId}" name="${field.name}" class="form-input" ${required} />`;
        }
        break;
      case 'number':
        inputElement = `<input type="number" id="${fieldId}" name="${field.name}" class="form-input" ${required} />`;
        break;
      case 'boolean':
        inputElement = `<div class="checkbox-wrapper">
          <input type="checkbox" id="${fieldId}" name="${field.name}" value="true" />
          <label for="${fieldId}">${label}</label>
        </div>`;
        break;
      case 'date':
        inputElement = `<input type="datetime-local" id="${fieldId}" name="${field.name}" class="form-input" ${required} />`;
        break;
      default:
        inputElement = `<input type="text" id="${fieldId}" name="${field.name}" class="form-input" ${required} />`;
    }
    
    if (field.type === 'boolean') {
      return `      <div class="form-group checkbox-group">
        ${inputElement}
      </div>`;
    }
    
    return `      <div class="form-group">
        <label for="${fieldId}" class="form-label">${label}</label>
        ${inputElement}
        <div class="field-error" id="${fieldId}_error"></div>
      </div>`;
  }

  /**
   * スタイルインクルードを取得
   */
  private getStyleIncludes(theme: string): string {
    const baseStyles = `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .header h1 { color: #333; }
    .btn-primary { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-secondary { background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .btn-danger { background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .back-btn { background: none; border: 1px solid #ccc; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
    .form-group { margin-bottom: 20px; }
    .form-label { display: block; margin-bottom: 5px; font-weight: 500; color: #333; }
    .form-input, .form-textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    .form-actions { margin-top: 30px; display: flex; gap: 10px; }
    .status-message { margin-top: 20px; padding: 15px; border-radius: 4px; }
    .status-message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .status-message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .table-container { background: white; border-radius: 8px; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    .data-table th { background: #f8f9fa; font-weight: 500; }
    .filters { margin-bottom: 20px; background: white; padding: 20px; border-radius: 8px; }
    .filter-row { display: flex; gap: 10px; align-items: center; }
    .pagination { display: flex; justify-content: center; margin-top: 20px; }
  </style>`;

    return baseStyles;
  }

  /**
   * フォーム用JavaScriptを生成
   */
  private generateFormScript(operation: string, entityName: string, options: UIGenerationOptions): string {
    return `
  <script>
    const ALLOWED_ORIGIN = '${options.origin}';
    
    document.addEventListener('DOMContentLoaded', function() {
      const form = document.getElementById('${operation}Form');
      const status = document.getElementById('status');
      
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const requestId = crypto.randomUUID();
        
        showStatus('Processing...', '');
        
        window.parent.postMessage({
          type: 'mcp:tool.invoke',
          requestId: requestId,
          tool: '${operation}${entityName}',
          params: data
        }, ALLOWED_ORIGIN);
        
        const messageHandler = (event) => {
          if (event.origin !== ALLOWED_ORIGIN) return;
          const { type, requestId: responseId, result, error } = event.data || {};
          
          if (responseId !== requestId) return;
          
          if (type === 'mcp:tool.result') {
            showStatus('Success! ${entityName} ${operation}d successfully.', 'success');
            if ('${operation}' === 'create') {
              form.reset();
            }
          } else if (type === 'mcp:tool.error') {
            showStatus('Error: ' + (error || 'Unknown error occurred'), 'error');
          }
          
          window.removeEventListener('message', messageHandler);
        };
        
        window.addEventListener('message', messageHandler);
        
        setTimeout(() => {
          showStatus('Request timed out', 'error');
          window.removeEventListener('message', messageHandler);
        }, 30000);
      });
    });
    
    function showStatus(message, type) {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = 'status-message' + (type ? ' ' + type : '');
    }
  </script>`;
  }

  /**
   * リスト用JavaScriptを生成
   */
  private generateListScript(entity: Entity, options: UIGenerationOptions): string {
    return `
  <script>
    const ALLOWED_ORIGIN = '${options.origin}';
    let currentPage = 1;
    let currentData = [];
    
    document.addEventListener('DOMContentLoaded', function() {
      loadData();
    });
    
    function loadData() {
      const searchQuery = document.getElementById('searchQuery').value;
      const sortBy = document.getElementById('sortBy').value;
      const sortOrder = document.getElementById('sortOrder').value;
      
      const params = {
        page: currentPage,
        limit: 20,
        sortBy: sortBy,
        order: sortOrder
      };
      
      const requestId = crypto.randomUUID();
      
      window.parent.postMessage({
        type: 'mcp:tool.invoke',
        requestId: requestId,
        tool: 'list${entity.name}',
        params: params
      }, ALLOWED_ORIGIN);
      
      const messageHandler = (event) => {
        if (event.origin !== ALLOWED_ORIGIN) return;
        const { type, requestId: responseId, result, error } = event.data || {};
        
        if (responseId !== requestId) return;
        
        if (type === 'mcp:tool.result') {
          currentData = result.items || [];
          renderTable(currentData);
          renderPagination(result);
        } else if (type === 'mcp:tool.error') {
          showStatus('Error: ' + (error || 'Failed to load data'), 'error');
        }
        
        window.removeEventListener('message', messageHandler);
      };
      
      window.addEventListener('message', messageHandler);
    }
    
    function renderTable(items) {
      const tbody = document.getElementById('dataTableBody');
      tbody.innerHTML = '';
      
      items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = \`
${entity.fields.slice(0, 5).map(field => `          <td>\${item.${field.name} || '-'}</td>`).join('\n')}
          <td>
            <button onclick="editItem('\${item.id}')" class="btn-secondary">Edit</button>
            <button onclick="deleteItem('\${item.id}')" class="btn-danger">Delete</button>
          </td>
        \`;
        tbody.appendChild(row);
      });
    }
    
    function editItem(id) {
      // Navigate to edit form with ID
      window.parent.postMessage({
        type: 'ui:navigate',
        url: '${entity.name.toLowerCase()}-edit-form',
        params: { id: id }
      }, ALLOWED_ORIGIN);
    }
    
    function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this ${entity.name.toLowerCase()}?')) return;
      
      const requestId = crypto.randomUUID();
      
      window.parent.postMessage({
        type: 'mcp:tool.invoke',
        requestId: requestId,
        tool: 'delete${entity.name}',
        params: { id: id }
      }, ALLOWED_ORIGIN);
      
      const messageHandler = (event) => {
        if (event.origin !== ALLOWED_ORIGIN) return;
        const { type, requestId: responseId, result, error } = event.data || {};
        
        if (responseId !== requestId) return;
        
        if (type === 'mcp:tool.result') {
          showStatus('${entity.name} deleted successfully', 'success');
          loadData(); // Reload the list
        } else if (type === 'mcp:tool.error') {
          showStatus('Error: ' + (error || 'Failed to delete'), 'error');
        }
        
        window.removeEventListener('message', messageHandler);
      };
      
      window.addEventListener('message', messageHandler);
    }
    
    function showCreateForm() {
      window.parent.postMessage({
        type: 'ui:navigate',
        url: '${entity.name.toLowerCase()}-create-form'
      }, ALLOWED_ORIGIN);
    }
    
    function showStatus(message, type) {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = 'status-message' + (type ? ' ' + type : '');
    }
  </script>`;
  }

  /**
   * 詳細表示用JavaScriptを生成
   */
  private generateDetailScript(entity: Entity, options: UIGenerationOptions): string {
    return `
  <script>
    const ALLOWED_ORIGIN = '${options.origin}';
    
    document.addEventListener('DOMContentLoaded', function() {
      const urlParams = new URLSearchParams(window.location.search);
      const entityId = urlParams.get('id');
      if (entityId) {
        loadEntityDetails(entityId);
      }
    });
    
    function loadEntityDetails(id) {
      const requestId = crypto.randomUUID();
      
      window.parent.postMessage({
        type: 'mcp:tool.invoke',
        requestId: requestId,
        tool: 'get${entity.name}ById',
        params: { id: id }
      }, ALLOWED_ORIGIN);
      
      const messageHandler = (event) => {
        if (event.origin !== ALLOWED_ORIGIN) return;
        const { type, requestId: responseId, result, error } = event.data || {};
        
        if (responseId !== requestId) return;
        
        if (type === 'mcp:tool.result') {
          renderDetails(result);
        } else if (type === 'mcp:tool.error') {
          showStatus('Error: ' + (error || 'Failed to load details'), 'error');
        }
        
        window.removeEventListener('message', messageHandler);
      };
      
      window.addEventListener('message', messageHandler);
    }
    
    function renderDetails(entity) {
      const container = document.getElementById('detailContent');
      container.innerHTML = \`
        <div class="detail-grid">
${entity.fields.map(field => `          <div class="detail-item">
            <label>${this.fieldNameToLabel(field.name)}:</label>
            <span>\${entity.${field.name} || '-'}</span>
          </div>`).join('\n')}
        </div>
      \`;
    }
  </script>`;
  }

  /**
   * 検索用JavaScriptを生成
   */
  private generateSearchScript(entity: Entity, options: UIGenerationOptions): string {
    return `
  <script>
    const ALLOWED_ORIGIN = '${options.origin}';
    
    function performSearch() {
      const query = document.getElementById('searchQuery').value;
      if (!query || query.trim().length < 2) {
        showStatus('Please enter at least 2 characters to search', 'error');
        return;
      }
      
      const selectedFields = Array.from(document.querySelectorAll('input[name="searchFields"]:checked'))
        .map(input => input.value);
      
      const requestId = crypto.randomUUID();
      
      window.parent.postMessage({
        type: 'mcp:tool.invoke',
        requestId: requestId,
        tool: 'search${entity.name}',
        params: {
          query: query,
          fields: selectedFields
        }
      }, ALLOWED_ORIGIN);
      
      const messageHandler = (event) => {
        if (event.origin !== ALLOWED_ORIGIN) return;
        const { type, requestId: responseId, result, error } = event.data || {};
        
        if (responseId !== requestId) return;
        
        if (type === 'mcp:tool.result') {
          renderSearchResults(result.items || []);
        } else if (type === 'mcp:tool.error') {
          showStatus('Error: ' + (error || 'Search failed'), 'error');
        }
        
        window.removeEventListener('message', messageHandler);
      };
      
      window.addEventListener('message', messageHandler);
    }
    
    function renderSearchResults(items) {
      const container = document.getElementById('searchResults');
      
      if (items.length === 0) {
        container.innerHTML = '<p>No results found.</p>';
        return;
      }
      
      container.innerHTML = \`
        <h3>Search Results (\${items.length})</h3>
        <div class="search-results-list">
          \${items.map(item => \`
            <div class="search-result-item">
              <h4>\${item.name || item.title || 'Item'}</h4>
              <div class="search-result-details">
${entity.fields.slice(0, 3).map(field => `                <span><strong>${this.fieldNameToLabel(field.name)}:</strong> \${item.${field.name} || '-'}</span>`).join('\n')}
              </div>
              <div class="search-result-actions">
                <button onclick="viewItem('\${item.id}')" class="btn-secondary">View</button>
                <button onclick="editItem('\${item.id}')" class="btn-primary">Edit</button>
              </div>
            </div>
          \`).join('')}
        </div>
      \`;
    }
  </script>`;
  }

  /**
   * ダッシュボード用JavaScriptを生成
   */
  private generateDashboardScript(entity: Entity, options: UIGenerationOptions): string {
    return `
  <script>
    const ALLOWED_ORIGIN = '${options.origin}';
    
    document.addEventListener('DOMContentLoaded', function() {
      loadDashboardData();
    });
    
    function loadDashboardData() {
      // Load basic stats
      loadStats();
      
      // Load recent items
      loadRecentItems();
    }
    
    function loadStats() {
      const requestId = crypto.randomUUID();
      
      window.parent.postMessage({
        type: 'mcp:tool.invoke',
        requestId: requestId,
        tool: 'get${entity.name}Stats',
        params: {}
      }, ALLOWED_ORIGIN);
      
      const messageHandler = (event) => {
        if (event.origin !== ALLOWED_ORIGIN) return;
        const { type, requestId: responseId, result, error } = event.data || {};
        
        if (responseId !== requestId) return;
        
        if (type === 'mcp:tool.result') {
          updateKPIs(result);
        }
        
        window.removeEventListener('message', messageHandler);
      };
      
      window.addEventListener('message', messageHandler);
    }
    
    function updateKPIs(stats) {
      document.getElementById('totalCount').textContent = stats.total || 0;
      
${entity.fields.filter(f => f.type === 'number').slice(0, 3).map(field => 
  `      if (stats.avg${field.name}) {
        document.getElementById('avg${field.name}').textContent = stats.avg${field.name}.toFixed(2);
      }`).join('\n')}
    }
    
    function refreshDashboard() {
      loadDashboardData();
    }
  </script>`;
  }

  private fieldNameToLabel(name: string): string {
    return name.replace(/([A-Z])/g, ' $1')
               .replace(/^./, str => str.toUpperCase())
               .trim();
  }
}