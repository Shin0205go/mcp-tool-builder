/**
 * Anthropic LLM Adapter
 * 既存のLLMベース生成器をLLMProviderインターfaceに適合
 */

import { LLMProvider } from './llm_in_the_loop_generator.js';
import { LLMBasedSpecGenerator } from './llm_based.js';

/**
 * Anthropic LLMアダプター
 */
export class AnthropicLLMAdapter implements LLMProvider {
  
  constructor(private llmGenerator: LLMBasedSpecGenerator) {}
  
  /**
   * プロンプトからJSON仕様を生成
   */
  async generate(prompt: string): Promise<string> {
    try {
      // 既存のLLMGeneratorを使用してGeneratedToolを生成し、JSON形式に変換
      const generatedTool = await this.llmGenerator.generateFromPrompt(prompt);
      
      // GeneratedToolをBuildersSpecに変換
      const builderSpec = this.convertToBuilderSpec(generatedTool);
      
      return JSON.stringify(builderSpec, null, 2);
      
    } catch (error) {
      throw new Error(`Anthropic LLM generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * GeneratedToolをBuilderSpec形式に変換
   */
  private convertToBuilderSpec(tool: any): any {
    return {
      name: tool.name || 'GeneratedTool',
      description: tool.description || '',
      entities: tool.entities?.map((entity: any) => ({
        name: entity.name,
        fields: entity.fields?.map((field: any) => ({
          name: field.name,
          type: this.normalizeFieldType(field.type),
          required: field.required || false,
          description: field.description
        })) || []
      })) || [],
      actions: tool.operations?.map((op: any) => ({
        name: op.name,
        type: this.normalizeActionType(op.name),
        entity: this.extractEntityFromAction(op.name, tool.entities || []),
        description: op.description
      })) || [],
      views: []
    };
  }
  
  private normalizeFieldType(type: string): string {
    if (!type) return 'string';
    const normalized = type.toLowerCase();
    const typeMap: Record<string, string> = {
      'text': 'string',
      'varchar': 'string', 
      'int': 'number',
      'integer': 'number',
      'float': 'number',
      'decimal': 'number',
      'bool': 'boolean'
    };
    return typeMap[normalized] || type;
  }
  
  private normalizeActionType(actionName: string): string {
    const name = actionName.toLowerCase();
    if (name.includes('create')) return 'create';
    if (name.includes('get') || name.includes('find')) return 'get';
    if (name.includes('update')) return 'update';
    if (name.includes('delete')) return 'delete';
    if (name.includes('list')) return 'list';
    if (name.includes('search')) return 'search';
    return 'create';
  }
  
  private extractEntityFromAction(actionName: string, entities: any[]): string {
    const name = actionName.toLowerCase();
    for (const entity of entities) {
      if (name.includes(entity.name.toLowerCase())) {
        return entity.name;
      }
    }
    return entities[0]?.name || 'Unknown';
  }
  
  /**
   * レスポンスからJSON部分を抽出
   */
  private extractJsonFromResponse(response: string): string | null {
    // JSON codeblock形式（```json...```）
    const jsonBlockMatch = response.match(/```(?:json)?\\s*([\\s\\S]*?)```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }
    
    // 裸のJSONオブジェクト（{ で始まり } で終わる）
    const jsonObjectMatch = response.match(/{[\\s\\S]*}/);
    if (jsonObjectMatch) {
      return jsonObjectMatch[0].trim();
    }
    
    return null;
  }
}

/**
 * ファクトリー関数
 */
export function createAnthropicLLMAdapter(llmGenerator: LLMBasedSpecGenerator): AnthropicLLMAdapter {
  return new AnthropicLLMAdapter(llmGenerator);
}