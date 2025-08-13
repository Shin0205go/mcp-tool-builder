import { z } from 'zod';

/**
 * Builder Spec Schema
 * 会話から正規化された中間仕様（唯一の真実源泉）
 */

export const FieldSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'date', 'json', 'uuid', 'email', 'phone']),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  indexed: z.boolean().default(false),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    enum: z.array(z.string()).optional(),
  }).optional(),
  piiType: z.enum(['none', 'email', 'phone', 'name', 'address', 'ssn', 'custom']).default('none'),
  description: z.string().optional(),
  metadata: z.record(z.any()).default({})
});

export const EntitySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  fields: z.array(FieldSchema),
  relationships: z.array(z.object({
    type: z.enum(['oneToMany', 'manyToOne', 'manyToMany']),
    entity: z.string(),
    foreignKey: z.string().optional(),
    through: z.string().optional()
  })).default([]),
  constraints: z.array(z.object({
    type: z.enum(['unique', 'check', 'foreign_key']),
    fields: z.array(z.string()),
    condition: z.string().optional()
  })).default([]),
  metadata: z.record(z.any()).default({})
});

export const ActionSchema = z.object({
  name: z.string(),
  type: z.enum(['create', 'read', 'update', 'delete', 'list', 'search', 'custom', 'workflow']),
  entity: z.string().optional(),
  description: z.string().optional(),
  inputs: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean().default(false),
    validation: z.any().optional()
  })).default([]),
  outputs: z.object({
    type: z.string(),
    schema: z.any().optional()
  }).optional(),
  businessRules: z.array(z.object({
    name: z.string(),
    condition: z.string(),
    action: z.string(),
    priority: z.number().default(100)
  })).default([]),
  permissions: z.array(z.string()).default([]),
  async: z.boolean().default(false),
  idempotent: z.boolean().default(true),
  metadata: z.record(z.any()).default({})
});

export const ViewSchema = z.object({
  name: z.string(),
  type: z.enum(['form', 'list', 'detail', 'dashboard', 'search', 'workflow', 'custom']),
  entity: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(z.object({
    field: z.string(),
    label: z.string().optional(),
    type: z.string().optional(),
    readonly: z.boolean().default(false),
    hidden: z.boolean().default(false),
    validation: z.any().optional()
  })).default([]),
  actions: z.array(z.string()).default([]),
  layout: z.object({
    columns: z.number().optional(),
    sections: z.array(z.object({
      name: z.string(),
      fields: z.array(z.string())
    })).optional()
  }).optional(),
  permissions: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

export const FlowSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(z.object({
    name: z.string(),
    type: z.enum(['action', 'condition', 'parallel', 'loop', 'wait']),
    action: z.string().optional(),
    condition: z.string().optional(),
    next: z.string().optional(),
    onSuccess: z.string().optional(),
    onError: z.string().optional(),
    timeout: z.number().optional(),
    retries: z.number().default(0)
  })),
  triggers: z.array(z.object({
    type: z.enum(['manual', 'event', 'schedule', 'webhook']),
    config: z.any()
  })).default([]),
  permissions: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

export const PolicySchema = z.object({
  name: z.string(),
  type: z.enum(['rbac', 'abac', 'pii_masking', 'rate_limit', 'validation', 'custom']),
  scope: z.enum(['global', 'entity', 'action', 'view']).default('global'),
  target: z.string().optional(),
  rules: z.array(z.object({
    condition: z.string(),
    effect: z.enum(['allow', 'deny', 'mask', 'log']),
    priority: z.number().default(100)
  })),
  config: z.record(z.any()).default({}),
  enabled: z.boolean().default(true),
  metadata: z.record(z.any()).default({})
});

export const CapabilityRequirementSchema = z.object({
  type: z.enum(['storage', 'queue', 'auth', 'notify', 'search', 'payment', 'llm', 'custom']),
  name: z.string(),
  required: z.boolean().default(true),
  config: z.record(z.any()).default({}),
  fallback: z.string().optional(),
  metadata: z.record(z.any()).default({})
});

export const BuilderSpecSchema = z.object({
  version: z.string().default('1.0.0'),
  name: z.string(),
  description: z.string(),
  entities: z.array(EntitySchema),
  actions: z.array(ActionSchema),
  views: z.array(ViewSchema),
  flows: z.array(FlowSchema).default([]),
  policies: z.array(PolicySchema).default([]),
  capabilities: z.array(CapabilityRequirementSchema).default([]),
  i18n: z.object({
    defaultLocale: z.string().default('en'),
    supportedLocales: z.array(z.string()).default(['en']),
    keys: z.record(z.record(z.string())).default({})
  }).default({}),
  metadata: z.record(z.any()).default({})
});

// Type exports
export type Field = z.infer<typeof FieldSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type Action = z.infer<typeof ActionSchema>;
export type View = z.infer<typeof ViewSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type Policy = z.infer<typeof PolicySchema>;
export type CapabilityRequirement = z.infer<typeof CapabilityRequirementSchema>;
export type BuilderSpec = z.infer<typeof BuilderSpecSchema>;

/**
 * Builder Spec Validator and Normalizer
 */
export class SpecValidator {
  
  /**
   * スペックを検証・正規化
   */
  static validate(spec: unknown): BuilderSpec {
    return BuilderSpecSchema.parse(spec);
  }
  
  /**
   * スペックをLint（命名規則、制約チェック等）
   */
  static lint(spec: BuilderSpec): LintResult {
    const issues: LintIssue[] = [];
    
    // Entity naming check
    spec.entities.forEach(entity => {
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(entity.name)) {
        issues.push({
          type: 'warning',
          category: 'naming',
          message: `Entity '${entity.name}' should be PascalCase`,
          path: `entities.${entity.name}`
        });
      }
      
      // Field uniqueness
      const fieldNames = entity.fields.map(f => f.name);
      const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
      if (duplicates.length > 0) {
        issues.push({
          type: 'error',
          category: 'constraint',
          message: `Duplicate field names in entity '${entity.name}': ${duplicates.join(', ')}`,
          path: `entities.${entity.name}.fields`
        });
      }
    });
    
    // Action-Entity reference check
    spec.actions.forEach(action => {
      if (action.entity && !spec.entities.find(e => e.name === action.entity)) {
        issues.push({
          type: 'error',
          category: 'reference',
          message: `Action '${action.name}' references unknown entity '${action.entity}'`,
          path: `actions.${action.name}.entity`
        });
      }
    });
    
    return {
      valid: issues.filter(i => i.type === 'error').length === 0,
      issues,
      score: this.calculateQualityScore(spec, issues)
    };
  }
  
  /**
   * 品質スコア計算
   */
  private static calculateQualityScore(spec: BuilderSpec, issues: LintIssue[]): number {
    let score = 100;
    
    // Issue penalties
    issues.forEach(issue => {
      if (issue.type === 'error') score -= 20;
      if (issue.type === 'warning') score -= 5;
    });
    
    // Completeness bonuses
    if (spec.description && spec.description.length > 20) score += 5;
    if (spec.policies.length > 0) score += 10;
    if (spec.flows.length > 0) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }
}

export interface LintResult {
  valid: boolean;
  issues: LintIssue[];
  score: number;
}

export interface LintIssue {
  type: 'error' | 'warning' | 'info';
  category: 'naming' | 'constraint' | 'reference' | 'security' | 'performance';
  message: string;
  path: string;
}