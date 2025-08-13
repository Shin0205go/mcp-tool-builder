/**
 * Shared type definitions for MCP Tool Builder
 */

export interface Field {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'uuid' | 'email' | 'phone';
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  description?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    enum?: string[];
  };
  piiType?: 'none' | 'email' | 'phone' | 'name' | 'address' | 'ssn' | 'custom';
  metadata?: Record<string, any>;
}

export interface Entity {
  name: string;
  description?: string;
  fields: Field[];
  relationships?: Array<{
    type: 'oneToMany' | 'manyToOne' | 'manyToMany';
    entity: string;
    foreignKey?: string;
    through?: string;
  }>;
  constraints?: Array<{
    type: 'unique' | 'check' | 'foreign_key';
    fields: string[];
    condition?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface Operation {
  name: string;
  type: 'create' | 'read' | 'update' | 'delete' | 'list' | 'search' | 'custom' | 'workflow';
  entity?: string;
  description?: string;
  inputs?: Array<{
    name: string;
    type: string;
    required?: boolean;
    validation?: any;
  }>;
  outputs?: {
    type: string;
    schema?: any;
  };
  businessRules?: Array<{
    name: string;
    condition: string;
    action: string;
    priority?: number;
  }>;
  permissions?: string[];
  async?: boolean;
  idempotent?: boolean;
  metadata?: Record<string, any>;
}

export interface GeneratedTool {
  name: string;
  description: string;
  entities: Entity[];
  operations: Operation[];
  metadata?: Record<string, any>;
}

export interface GeneratedOperation {
  name: string;
  description: string;
  implementation: string;
  inputSchema: any;
  outputSchema?: any;
  metadata?: Record<string, any>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema?: any;
}

export interface MCPToolSchema {
  name: string;
  description: string;
  tools: MCPTool[];
}