import { GeneratedTool, Entity, Operation } from '../types/index.js';
import Anthropic from '@anthropic-ai/sdk';

/**
 * LLM-based spec generator using Anthropic Claude
 */
export class LLMBasedSpecGenerator {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generateFromPrompt(prompt: string): Promise<GeneratedTool> {
    try {
      const systemPrompt = `You are an expert software architect that generates MCP tool specifications from natural language descriptions.

Given a user prompt, analyze it and generate a JSON specification with the following structure:

{
  "name": "tool_name", // snake_case, descriptive name
  "description": "Brief description of what this tool does",
  "entities": [
    {
      "name": "EntityName", // PascalCase
      "description": "Description of the entity",
      "fields": [
        {
          "name": "fieldName", // camelCase
          "type": "string|number|boolean|email|url|date|json", 
          "required": true|false,
          "description": "Field description (optional)"
        }
      ]
    }
  ],
  "operations": [
    {
      "name": "operationName", // camelCase, descriptive verb + noun
      "type": "create|read|update|delete|list|search|custom",
      "entity": "EntityName", // matches entity name
      "description": "What this operation does"
    }
  ]
}

Key guidelines:
- Infer entities from the domain described
- Each entity should have 3-8 meaningful fields
- Include common fields like id, createdAt, updatedAt automatically
- Generate comprehensive CRUD operations for each entity
- Use appropriate field types (email for emails, date for dates, etc.)
- Operation names should be descriptive (e.g., "createTask", "listCustomers", "searchProducts")
- Tool name should be snake_case and descriptive

Respond ONLY with valid JSON, no explanations or markdown.`;

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Anthropic API');
      }

      let responseText = content.text.trim();
      
      // Clean up potential markdown formatting
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(responseText);
      
      // Validate and enhance the response
      const tool: GeneratedTool = this.validateAndEnhance(parsed, prompt);
      
      return tool;

    } catch (error) {
      console.error('Error generating tool specification:', error);
      
      // Fallback to basic implementation based on prompt
      return this.generateFallbackFromPrompt(prompt);
    }
  }

  private validateAndEnhance(parsed: any, originalPrompt: string): GeneratedTool {
    // Ensure required fields exist
    const tool: GeneratedTool = {
      name: parsed.name || 'generated_tool',
      description: parsed.description || `Generated tool from prompt: ${originalPrompt}`,
      entities: [],
      operations: []
    };

    // Process entities
    if (parsed.entities && Array.isArray(parsed.entities)) {
      tool.entities = parsed.entities.map((entity: any) => {
        const enhancedEntity: Entity = {
          name: entity.name || 'Entity',
          description: entity.description || `${entity.name} entity`,
          fields: []
        };

        // Add standard fields
        enhancedEntity.fields.push(
          { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
          { name: 'createdAt', type: 'date', required: true, description: 'Creation timestamp' },
          { name: 'updatedAt', type: 'date', required: true, description: 'Last update timestamp' }
        );

        // Add user-defined fields
        if (entity.fields && Array.isArray(entity.fields)) {
          entity.fields.forEach((field: any) => {
            // Map field types to valid values
            let fieldType: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'uuid' | 'email' | 'phone' = 'string';
            switch (field.type) {
              case 'number':
                fieldType = 'number';
                break;
              case 'boolean':
                fieldType = 'boolean';
                break;
              case 'date':
                fieldType = 'date';
                break;
              case 'json':
                fieldType = 'json';
                break;
              case 'uuid':
                fieldType = 'uuid';
                break;
              case 'email':
                fieldType = 'email';
                break;
              case 'phone':
                fieldType = 'phone';
                break;
              case 'url': // Map url to string for now
              default:
                fieldType = 'string';
                break;
            }
            
            enhancedEntity.fields.push({
              name: field.name || 'field',
              type: fieldType,
              required: field.required !== false,
              description: field.description
            });
          });
        }

        return enhancedEntity;
      });
    }

    // Process operations
    if (parsed.operations && Array.isArray(parsed.operations)) {
      tool.operations = parsed.operations.map((operation: any): Operation => ({
        name: operation.name || 'operation',
        type: operation.type || 'create',
        entity: operation.entity || (tool.entities[0]?.name || 'Entity'),
        description: operation.description || `${operation.type} ${operation.entity}`
      }));
    }

    // If no operations were provided, generate basic CRUD for first entity
    if (tool.operations.length === 0 && tool.entities.length > 0) {
      const firstEntity = tool.entities[0];
      const entityName = firstEntity.name;
      const entityLower = entityName.toLowerCase();
      
      tool.operations = [
        { name: `create${entityName}`, type: 'create', entity: entityName, description: `Create a new ${entityLower}` },
        { name: `get${entityName}`, type: 'read', entity: entityName, description: `Get a ${entityLower} by ID` },
        { name: `update${entityName}`, type: 'update', entity: entityName, description: `Update a ${entityLower}` },
        { name: `delete${entityName}`, type: 'delete', entity: entityName, description: `Delete a ${entityLower}` },
        { name: `list${entityName}s`, type: 'list', entity: entityName, description: `List all ${entityLower}s` }
      ];
    }

    return tool;
  }

  private generateFallbackFromPrompt(prompt: string): GeneratedTool {
    // Simple keyword-based fallback
    const lowerPrompt = prompt.toLowerCase();
    
    let toolName = 'generated_tool';
    let entityName = 'Item';
    let entityFields: Array<{name: string; type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'uuid' | 'email' | 'phone'; required: boolean}> = [
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false }
    ];

    // Try to infer from common patterns
    if (lowerPrompt.includes('task') || lowerPrompt.includes('todo')) {
      toolName = 'task_manager';
      entityName = 'Task';
      entityFields = [
        { name: 'title', type: 'string', required: true },
        { name: 'description', type: 'string', required: false },
        { name: 'completed', type: 'boolean', required: true },
        { name: 'dueDate', type: 'date', required: false }
      ];
    } else if (lowerPrompt.includes('customer') || lowerPrompt.includes('client')) {
      toolName = 'customer_manager';
      entityName = 'Customer';
      entityFields = [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'string', required: false },
        { name: 'company', type: 'string', required: false }
      ];
    } else if (lowerPrompt.includes('product') || lowerPrompt.includes('inventory')) {
      toolName = 'inventory_manager';
      entityName = 'Product';
      entityFields = [
        { name: 'name', type: 'string', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'stock', type: 'number', required: true },
        { name: 'category', type: 'string', required: false }
      ];
    } else if (lowerPrompt.includes('note') || lowerPrompt.includes('memo')) {
      toolName = 'note_manager';
      entityName = 'Note';
      entityFields = [
        { name: 'title', type: 'string', required: true },
        { name: 'content', type: 'string', required: true },
        { name: 'tags', type: 'json', required: false }
      ];
    }

    return {
      name: toolName,
      description: `Generated tool from prompt: ${prompt}`,
      entities: [{
        name: entityName,
        description: `${entityName} entity`,
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'createdAt', type: 'date', required: true },
          { name: 'updatedAt', type: 'date', required: true },
          ...entityFields
        ]
      }],
      operations: [
        { name: `create${entityName}`, type: 'create', entity: entityName, description: `Create a new ${entityName.toLowerCase()}` },
        { name: `get${entityName}`, type: 'read', entity: entityName, description: `Get a ${entityName.toLowerCase()} by ID` },
        { name: `update${entityName}`, type: 'update', entity: entityName, description: `Update a ${entityName.toLowerCase()}` },
        { name: `delete${entityName}`, type: 'delete', entity: entityName, description: `Delete a ${entityName.toLowerCase()}` },
        { name: `list${entityName}s`, type: 'list', entity: entityName, description: `List all ${entityName.toLowerCase()}s` }
      ]
    };
  }
}