import { Entity, Field } from '../types/index.js';
import { z } from 'zod';

export interface SchemaContext {
  entityName: string;
  fields: Field[];
  operations: string[];
}

/**
 * 単一スキーマ源泉システム
 * Zodスキーマを中心として、MCP Tool定義・UI・DAOを自動生成
 */
export class SchemaFirstGenerator {
  
  /**
   * エンティティからZodスキーマコードを生成
   */
  generateZodSchema(entity: Entity): string {
    const entityName = entity.name;
    const fields = entity.fields;
    
    return `import { z } from "zod";

// Base ${entityName} schema (single source of truth)
export const ${entityName} = z.object({
  id: z.string().uuid().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
${fields.map(field => this.generateZodField(field)).join(',\n')}
});

// Input/Output schemas for operations
export const Create${entityName}Input = ${entityName}.pick({ ${this.getCreateFields(fields)} });
export const Create${entityName}Output = ${entityName};

export const Update${entityName}Input = ${entityName}.pick({ ${this.getUpdateFields(fields)} }).partial();
export const Update${entityName}Output = ${entityName};

export const List${entityName}Input = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
${this.getFilterFields(fields)}
});
export const List${entityName}Output = z.object({
  items: z.array(${entityName}),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const Search${entityName}Input = z.object({
  query: z.string().min(2),
  fields: z.array(z.string()).default([${this.getSearchableFields(fields)}]),
${this.getFilterFields(fields)}
});
export const Search${entityName}Output = z.object({
  items: z.array(${entityName}),
  total: z.number(),
});

// Common delete result schema
export const DeleteResult = z.object({
  success: z.boolean(),
});

// Type exports for TypeScript
export type ${entityName}Type = z.infer<typeof ${entityName}>;
export type Create${entityName}InputType = z.infer<typeof Create${entityName}Input>;
export type Create${entityName}OutputType = z.infer<typeof Create${entityName}Output>;
export type Update${entityName}InputType = z.infer<typeof Update${entityName}Input>;
export type Update${entityName}OutputType = z.infer<typeof Update${entityName}Output>;
export type List${entityName}InputType = z.infer<typeof List${entityName}Input>;
export type List${entityName}OutputType = z.infer<typeof List${entityName}Output>;
export type Search${entityName}InputType = z.infer<typeof Search${entityName}Input>;
export type Search${entityName}OutputType = z.infer<typeof Search${entityName}Output>;
export type DeleteResultType = z.infer<typeof DeleteResult>;
`;
  }

  /**
   * MCPツール用JSONスキーマを生成
   */
  generateMcpToolSchema(entity: Entity, operation: string): any {
    const entityName = entity.name;
    
    const schemas: Record<string, any> = {
      create: {
        type: 'object',
        properties: this.fieldsToJsonSchema(entity.fields, false),
        required: entity.fields.filter(f => f.required).map(f => f.name),
      },
      update: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          ...this.fieldsToJsonSchema(entity.fields, true),
        },
        required: ['id'],
      },
      list: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          sortBy: { type: 'string', default: 'createdAt' },
          order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          ...this.getFilterJsonSchema(entity.fields),
        },
      },
      search: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 2 },
          fields: { type: 'array', items: { type: 'string' } },
          ...this.getFilterJsonSchema(entity.fields),
        },
        required: ['query'],
      },
    };

    return schemas[operation] || schemas.create;
  }

  /**
   * UIフォーム用HTMLを生成
   */
  generateUIForm(entity: Entity, operation: string): string {
    const entityName = entity.name;
    const fields = entity.fields;
    
    const formFields = operation === 'update' 
      ? `<input type="hidden" name="id" required />\n${fields.map(f => this.generateFormField(f, true)).join('\n')}`
      : fields.map(f => this.generateFormField(f, false)).join('\n');
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${this.getOperationTitle(operation)} ${entityName}</title>
  <style>
    .form-container { max-width: 500px; margin: 20px auto; padding: 20px; }
    .field { margin-bottom: 15px; }
    .field label { display: block; margin-bottom: 5px; font-weight: bold; }
    .field input, .field select, .field textarea { 
      width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; 
    }
    .submit-btn { 
      background: #007bff; color: white; padding: 10px 20px; 
      border: none; border-radius: 4px; cursor: pointer; 
    }
    .submit-btn:hover { background: #0056b3; }
    .status { margin-top: 15px; padding: 10px; border-radius: 4px; }
    .status.success { background: #d4edda; color: #155724; }
    .status.error { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="form-container">
    <h2>${this.getOperationTitle(operation)} ${entityName}</h2>
    <form id="form">
${formFields}
      <button type="submit" class="submit-btn">${this.getSubmitText(operation)}</button>
    </form>
    <div id="status"></div>
  </div>
  
  <script>
    const ALLOWED_ORIGIN = '${this.getOriginPlaceholder()}'; // Will be replaced at generation time
    const form = document.getElementById('form');
    const status = document.getElementById('status');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      const requestId = crypto.randomUUID();
      
      // Show loading state
      status.className = 'status';
      status.textContent = 'Processing...';
      
      // Send to parent via postMessage
      window.parent.postMessage({
        type: 'mcp:tool.invoke',
        requestId: requestId,
        tool: '${operation}${entityName}',
        params: data
      }, ALLOWED_ORIGIN);
      
      // Listen for response
      const messageHandler = (event) => {
        if (event.origin !== ALLOWED_ORIGIN) return;
        
        const { type, requestId: responseId, result, error } = event.data || {};
        
        if (responseId !== requestId) return;
        
        if (type === 'mcp:tool.result') {
          status.className = 'status success';
          status.textContent = 'Success! ${entityName} ${operation}d successfully.';
          if (${operation === 'create'}) {
            form.reset();
          }
          window.removeEventListener('message', messageHandler);
        } else if (type === 'mcp:tool.error') {
          status.className = 'status error';
          status.textContent = 'Error: ' + (error || 'Unknown error occurred');
          window.removeEventListener('message', messageHandler);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        status.className = 'status error';
        status.textContent = 'Request timed out';
        window.removeEventListener('message', messageHandler);
      }, 30000);
    });
  </script>
</body>
</html>`;
  }

  private generateZodField(field: Field): string {
    let zodType = this.getZodType(field.type);
    
    if (!field.required) {
      zodType += '.optional()';
    }
    
    // Add validation based on field type
    if (field.type === 'string' && field.name === 'email') {
      zodType = 'z.string().email()';
    } else if (field.type === 'string' && field.name.includes('phone')) {
      zodType = 'z.string().regex(/^[+]?[0-9\\s\\-\\(\\)]+$/)';
    }
    
    if (!field.required) {
      zodType += '.optional()';
    }
    
    return `  ${field.name}: ${zodType}`;
  }

  private getZodType(type: string): string {
    switch (type) {
      case 'string': return 'z.string()';
      case 'number': return 'z.number()';
      case 'boolean': return 'z.boolean()';
      case 'date': return 'z.string().datetime()';
      default: return 'z.string()';
    }
  }

  private getCreateFields(fields: Field[]): string {
    return fields.map(f => `${f.name}: true`).join(', ');
  }

  private getUpdateFields(fields: Field[]): string {
    return fields.map(f => `${f.name}: true`).join(', ');
  }

  private getFilterFields(fields: Field[]): string {
    const filterableFields = fields.filter(f => 
      ['string', 'number', 'date'].includes(f.type)
    );
    
    return filterableFields.map(field => {
      const zodType = this.getZodType(field.type);
      return `  ${field.name}: ${zodType}.optional()`;
    }).join(',\n');
  }

  private getSearchableFields(fields: Field[]): string {
    const searchable = fields
      .filter(f => f.type === 'string')
      .map(f => `'${f.name}'`);
    return searchable.join(', ');
  }

  private fieldsToJsonSchema(fields: Field[], optional: boolean = false): Record<string, any> {
    const properties: Record<string, any> = {};
    
    fields.forEach(field => {
      properties[field.name] = this.fieldToJsonSchemaProperty(field);
    });
    
    return properties;
  }

  private fieldToJsonSchemaProperty(field: Field): any {
    const baseProperty: any = {};
    
    switch (field.type) {
      case 'string':
        baseProperty.type = 'string';
        if (field.name === 'email') {
          baseProperty.format = 'email';
        }
        break;
      case 'number':
        baseProperty.type = 'number';
        break;
      case 'boolean':
        baseProperty.type = 'boolean';
        break;
      case 'date':
        baseProperty.type = 'string';
        baseProperty.format = 'date-time';
        break;
      default:
        baseProperty.type = 'string';
    }
    
    return baseProperty;
  }

  private getFilterJsonSchema(fields: Field[]): Record<string, any> {
    const filterProperties: Record<string, any> = {};
    
    fields.filter(f => ['string', 'number', 'date'].includes(f.type))
      .forEach(field => {
        filterProperties[field.name] = this.fieldToJsonSchemaProperty(field);
      });
    
    return filterProperties;
  }

  private generateFormField(field: Field, isUpdate: boolean): string {
    const required = field.required && !isUpdate ? 'required' : '';
    const label = this.fieldNameToLabel(field.name);
    
    let inputElement = '';
    
    switch (field.type) {
      case 'string':
        if (field.name === 'email') {
          inputElement = `<input type="email" name="${field.name}" placeholder="${label}" ${required} />`;
        } else if (field.name.includes('phone')) {
          inputElement = `<input type="tel" name="${field.name}" placeholder="${label}" ${required} />`;
        } else if (field.name === 'description' || field.name.includes('note')) {
          inputElement = `<textarea name="${field.name}" placeholder="${label}" ${required}></textarea>`;
        } else {
          inputElement = `<input type="text" name="${field.name}" placeholder="${label}" ${required} />`;
        }
        break;
      case 'number':
        inputElement = `<input type="number" name="${field.name}" placeholder="${label}" ${required} />`;
        break;
      case 'boolean':
        inputElement = `<input type="checkbox" name="${field.name}" value="true" /> <label>${label}</label>`;
        break;
      case 'date':
        inputElement = `<input type="datetime-local" name="${field.name}" ${required} />`;
        break;
      default:
        inputElement = `<input type="text" name="${field.name}" placeholder="${label}" ${required} />`;
    }
    
    return `      <div class="field">
        <label>${label}</label>
        ${inputElement}
      </div>`;
  }

  private fieldNameToLabel(name: string): string {
    return name.replace(/([A-Z])/g, ' $1')
               .replace(/^./, str => str.toUpperCase())
               .trim();
  }

  private getOperationTitle(operation: string): string {
    switch (operation) {
      case 'create': return 'Create';
      case 'update': return 'Edit';
      case 'list': return 'List';
      case 'search': return 'Search';
      default: return 'Manage';
    }
  }

  private getSubmitText(operation: string): string {
    switch (operation) {
      case 'create': return 'Create';
      case 'update': return 'Update';
      case 'list': return 'Search';
      case 'search': return 'Search';
      default: return 'Submit';
    }
  }

  private getOriginPlaceholder(): string {
    return '{{UI_ORIGIN}}'; // Will be replaced during generation
  }
}