/**
 * JSON Schema Validator for LLM Output
 * LLMの出力を JSON Schema で厳格にバリデーション
 */

import { z } from 'zod';

// BuilderSpec JSON Schema (Zod version)
export const BuilderSpecSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  entities: z.array(z.object({
    name: z.string().min(1, "Entity name is required"),
    fields: z.array(z.object({
      name: z.string().min(1, "Field name is required"),
      type: z.enum([
        'string', 'number', 'boolean',
        'uuid', 'email', 'date', 'datetime',
        'phone', 'price'
      ], { errorMap: () => ({ message: "Type must be one of: string, number, boolean, uuid, email, date, datetime, phone, price" }) }),
      required: z.boolean().default(false),
      description: z.string().optional()
    })).min(1, "At least one field is required")
  })).min(1, "At least one entity is required"),
  
  actions: z.array(z.object({
    name: z.string().min(1, "Action name is required"),
    type: z.enum(['create', 'get', 'update', 'delete', 'list', 'search'], 
      { errorMap: () => ({ message: "Action type must be: create, get, update, delete, list, or search" }) }),
    entity: z.string().min(1, "Entity name is required"),
    description: z.string().optional()
  })).min(1, "At least one action is required"),
  
  views: z.array(z.object({
    name: z.string().min(1, "View name is required"),
    type: z.enum(['form', 'list', 'detail', 'dashboard'],
      { errorMap: () => ({ message: "View type must be: form, list, detail, or dashboard" }) }),
    uses: z.array(z.string()).min(1, "At least one action is required"),
    description: z.string().optional()
  })).optional()
});

export type ValidatedBuilderSpec = z.infer<typeof BuilderSpecSchema>;

/**
 * LLM用プロンプトテンプレート（JSON限定）
 */
export function generateJsonOnlyPrompt(requirement: string): string {
  return `次の要件から BuilderSpec JSON だけを出力してください。コードや自然文は禁止です。

JSON Schema:
{
  "name": "string (PascalCase project name)",
  "description": "string (optional)",
  "entities": [
    {
      "name": "string (PascalCase entity name)",
      "fields": [
        {
          "name": "string (camelCase field name)",
          "type": "string|number|boolean|uuid|email|date|datetime|phone|price",
          "required": "boolean",
          "description": "string (optional)"
        }
      ]
    }
  ],
  "actions": [
    {
      "name": "string (camelCase action name)",
      "type": "create|get|update|delete|list|search",
      "entity": "string (target entity name)",
      "description": "string (optional)"
    }
  ],
  "views": [
    {
      "name": "string (PascalCase view name)",
      "type": "form|list|detail|dashboard",
      "uses": ["string (action names)"],
      "description": "string (optional)"
    }
  ]
}

制約:
- 型は string|number|boolean|uuid|email|date|datetime|phone|price のいずれかに正規化
- 重複フィールド禁止
- 必須: name, entities(1つ以上), actions(1つ以上)
- views は省略可能

要件: "${requirement}"

BuilderSpec JSON:`;
}

/**
 * LLM出力バリデーター
 */
export class LLMOutputValidator {
  
  /**
   * JSON文字列をパースしてバリデーション
   */
  validate(jsonString: string): ValidatedBuilderSpec {
    // JSON パース
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Schema バリデーション
    try {
      return BuilderSpecSchema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join('\n');
        throw new Error(`Schema validation failed:\n${issues}`);
      }
      throw error;
    }
  }
  
  /**
   * バリデーションエラーメッセージからLLM再プロンプト生成
   */
  generateRetryPrompt(originalRequirement: string, validationError: string): string {
    return `前回の BuilderSpec JSON にエラーがありました。修正して再出力してください。

エラー内容:
${validationError}

修正のポイント:
- JSON形式が正しいか確認
- 必須フィールド(name, entities, actions)が揃っているか
- 型は string|number|boolean|uuid|email|date|datetime|phone|price のみ使用
- フィールド名に重複がないか確認

元の要件: "${originalRequirement}"

修正版 BuilderSpec JSON:`;
  }
}

/**
 * ファクトリー関数
 */
export function createLLMOutputValidator(): LLMOutputValidator {
  return new LLMOutputValidator();
}