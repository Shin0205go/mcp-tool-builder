import { BuilderSpec, SpecValidator, LintResult } from '../spec/builder_spec.js';
import { ProviderMap, GenerationConfig, GeneratedFile } from '../template_packs/base.js';
import { StorageProvider } from '../capabilities/storage.js';
import { QueueProvider } from '../capabilities/queue.js';
import { AuthProvider } from '../capabilities/auth.js';

/**
 * Generator Hooks System
 * 生成パイプラインの各段階での拡張ポイント
 */
export interface GeneratorHooks {
  /**
   * 生成前の前処理
   * - スペックの正規化
   * - Lint実行
   * - 制約チェック
   */
  preGenerate(spec: BuilderSpec, context: GenerationContext): Promise<PreGenerateResult>;
  
  /**
   * 必要なCapabilityの解析とProvider選択
   */
  mapCapabilities(spec: BuilderSpec, context: GenerationContext): Promise<ProviderMap>;
  
  /**
   * コード生成の実行
   */
  emit(spec: BuilderSpec, providers: ProviderMap, context: GenerationContext): Promise<GeneratedArtifacts>;
  
  /**
   * 生成後の後処理
   * - 成果物の検証
   * - 品質チェック
   * - メタデータ生成
   */
  postGenerate(artifacts: GeneratedArtifacts, context: GenerationContext): Promise<PostGenerateResult>;
}

export interface GenerationContext {
  config: GenerationConfig;
  metadata: Record<string, any>;
  logger: Logger;
  capabilities: CapabilityResolver;
}

export interface PreGenerateResult {
  spec: BuilderSpec;
  lint: LintResult;
  warnings: string[];
  metadata: Record<string, any>;
}

export interface GeneratedArtifacts {
  files: GeneratedFile[];
  dependencies: PackageDependency[];
  scripts: GeneratedScript[];
  infrastructure: InfrastructureSpec[];
  documentation: DocumentationFile[];
  metadata: ArtifactMetadata;
}

export interface PostGenerateResult {
  success: boolean;
  report: GenerationReport;
  warnings: string[];
  errors: string[];
}

export interface PackageDependency {
  name: string;
  version: string;
  type: 'production' | 'development';
  optional?: boolean;
}

export interface GeneratedScript {
  name: string;
  command: string;
  description: string;
}

export interface InfrastructureSpec {
  type: 'docker' | 'compose' | 'kubernetes' | 'terraform' | 'cloudformation';
  name: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface DocumentationFile {
  name: string;
  content: string;
  type: 'readme' | 'api' | 'guide' | 'reference';
}

export interface ArtifactMetadata {
  specVersion: string;
  templatePackVersion: string;
  runtimeAbi: string;
  generatedAt: Date;
  generatorVersion: string;
  capabilities: string[];
  features: string[];
  quality: QualityMetrics;
}

export interface QualityMetrics {
  lintScore: number;
  testCoverage?: number;
  complexity: number;
  maintainability: number;
  security: number;
}

export interface GenerationReport {
  duration: number;
  filesGenerated: number;
  linesOfCode: number;
  quality: QualityMetrics;
  recommendations: string[];
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface CapabilityResolver {
  resolveStorage(requirement: string): Promise<StorageProvider>;
  resolveQueue(requirement: string): Promise<QueueProvider>;
  resolveAuth(requirement: string): Promise<AuthProvider>;
  isAvailable(capability: string): boolean;
  listAvailable(): string[];
}

/**
 * Default Generator Implementation
 */
export class DefaultGenerator implements GeneratorHooks {
  
  async preGenerate(spec: BuilderSpec, context: GenerationContext): Promise<PreGenerateResult> {
    context.logger.info('Running pre-generation validation...');
    
    // Validate and lint spec
    const validatedSpec = SpecValidator.validate(spec);
    const lint = SpecValidator.lint(validatedSpec);
    
    const warnings: string[] = [];
    
    // Check for common issues
    if (validatedSpec.entities.length === 0) {
      warnings.push('No entities defined - this will generate minimal functionality');
    }
    
    if (validatedSpec.actions.length === 0) {
      warnings.push('No actions defined - only basic CRUD operations will be available');
    }
    
    // Security checks
    const piiFields = validatedSpec.entities
      .flatMap(e => e.fields)
      .filter(f => f.piiType !== 'none');
    
    if (piiFields.length > 0 && !validatedSpec.policies.some(p => p.type === 'pii_masking')) {
      warnings.push('PII fields detected but no masking policy defined');
    }
    
    context.logger.info(`Validation complete. Score: ${lint.score}/100`);
    
    return {
      spec: validatedSpec,
      lint,
      warnings,
      metadata: {
        validatedAt: new Date(),
        originalComplexity: this.calculateComplexity(spec)
      }
    };
  }
  
  async mapCapabilities(spec: BuilderSpec, context: GenerationContext): Promise<ProviderMap> {
    context.logger.info('Resolving capabilities...');
    
    const providers: ProviderMap = {
      storage: 'postgres' // Default
    };
    
    // Auto-detect required capabilities
    const requirements = spec.capabilities;
    
    // Check for async actions
    const hasAsyncActions = spec.actions.some(a => a.async);
    if (hasAsyncActions && !requirements.find(r => r.type === 'queue')) {
      providers.queue = 'memory'; // Default queue
    }
    
    // Check for auth requirements
    const hasAuthPolicies = spec.policies.some(p => p.type === 'rbac' || p.type === 'abac');
    if (hasAuthPolicies && !requirements.find(r => r.type === 'auth')) {
      providers.auth = 'basic'; // Default auth
    }
    
    // Check for search requirements
    const hasSearchViews = spec.views.some(v => v.type === 'search');
    if (hasSearchViews && !requirements.find(r => r.type === 'search')) {
      providers.search = 'basic'; // Default search
    }
    
    // Apply explicit requirements
    requirements.forEach(req => {
      (providers as any)[req.type] = req.name;
    });
    
    context.logger.info('Capabilities resolved:', providers);
    return providers;
  }
  
  async emit(
    spec: BuilderSpec, 
    providers: ProviderMap, 
    context: GenerationContext
  ): Promise<GeneratedArtifacts> {
    context.logger.info('Generating artifacts...');
    
    const startTime = Date.now();
    const files: GeneratedFile[] = [];
    const dependencies: PackageDependency[] = [];
    const scripts: GeneratedScript[] = [];
    const infrastructure: InfrastructureSpec[] = [];
    const documentation: DocumentationFile[] = [];
    
    // Get template pack
    const { templatePackRegistry } = await import('../template_packs/base.js');
    const templatePack = templatePackRegistry.get(context.config.framework || 'crud');
    
    if (!templatePack) {
      throw new Error(`Template pack not found: ${context.config.framework || 'crud'}`);
    }
    
    const templateContext = {
      spec,
      providers,
      config: context.config,
      metadata: context.metadata
    };
    
    // Generate DAO files
    for (const entity of spec.entities) {
      const daoFile = await templatePack.renderDAO(entity, templateContext);
      files.push(daoFile);
    }
    
    // Generate tool files
    for (const action of spec.actions) {
      const toolFile = await templatePack.renderTool(action, templateContext);
      files.push(toolFile);
    }
    
    // Generate view files
    for (const view of spec.views) {
      const viewFile = await templatePack.renderView(view, templateContext);
      files.push(viewFile);
    }
    
    // Generate dashboard if analytics enabled
    if (context.config.features.analytics) {
      const metrics = this.extractMetrics(spec);
      const dashboardFile = await templatePack.renderDashboard(metrics, templateContext);
      files.push(dashboardFile);
    }
    
    // Generate migration
    const migrationFile = await templatePack.renderMigration(spec.entities, templateContext);
    files.push(migrationFile);
    
    // Generate configuration files
    const configFiles = await templatePack.renderConfig(spec, templateContext);
    files.push(...configFiles);
    
    // Generate tests (if enabled)
    const testFiles = await templatePack.renderTests(spec, templateContext);
    files.push(...testFiles);
    
    // Generate documentation
    const docFiles = await templatePack.renderDocs(spec, templateContext);
    documentation.push(...docFiles.map(f => ({
      name: f.path.split('/').pop() || f.path,
      content: f.content,
      type: f.type as 'readme' | 'api' | 'guide' | 'reference'
    })));
    
    // Add base dependencies
    dependencies.push(
      { name: '@modelcontextprotocol/sdk', version: '^1.0.0', type: 'production' },
      { name: 'zod', version: '^3.22.0', type: 'production' },
      { name: 'dotenv', version: '^16.3.0', type: 'production' }
    );
    
    // Add provider-specific dependencies
    if (providers.storage === 'postgres') {
      dependencies.push({ name: 'pg', version: '^8.11.0', type: 'production' });
      dependencies.push({ name: '@types/pg', version: '^8.10.0', type: 'development' });
    }
    
    if (providers.queue === 'redis') {
      dependencies.push({ name: 'ioredis', version: '^5.3.0', type: 'production' });
    }
    
    // Add scripts
    scripts.push(
      { name: 'build', command: 'tsc', description: 'Build TypeScript code' },
      { name: 'start', command: 'node dist/index.js', description: 'Start the MCP server' },
      { name: 'dev', command: 'tsc --watch', description: 'Build in watch mode' },
      { name: 'db:migrate', command: 'node dist/scripts/migrate.js', description: 'Run database migrations' }
    );
    
    const duration = Date.now() - startTime;
    
    const metadata: ArtifactMetadata = {
      specVersion: spec.version,
      templatePackVersion: templatePack.version,
      runtimeAbi: '1.0.0',
      generatedAt: new Date(),
      generatorVersion: '1.0.0',
      capabilities: Object.values(providers),
      features: Object.entries(context.config.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature),
      quality: {
        lintScore: 85, // TODO: Calculate from actual metrics
        complexity: this.calculateComplexity(spec),
        maintainability: 80,
        security: 75
      }
    };
    
    context.logger.info(`Generated ${files.length} files in ${duration}ms`);
    
    return {
      files,
      dependencies,
      scripts,
      infrastructure,
      documentation,
      metadata
    };
  }
  
  async postGenerate(
    artifacts: GeneratedArtifacts, 
    context: GenerationContext
  ): Promise<PostGenerateResult> {
    context.logger.info('Running post-generation validation...');
    
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check for file conflicts
    const filePaths = artifacts.files.map(f => f.path);
    const duplicates = filePaths.filter((path, index) => filePaths.indexOf(path) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate file paths detected: ${duplicates.join(', ')}`);
    }
    
    // Security checks
    if (artifacts.metadata.quality.security < 70) {
      warnings.push('Security score is below recommended threshold');
    }
    
    // Complexity checks
    if (artifacts.metadata.quality.complexity > 80) {
      warnings.push('Generated code complexity is high - consider simplification');
    }
    
    const report: GenerationReport = {
      duration: 0, // Will be calculated by caller
      filesGenerated: artifacts.files.length,
      linesOfCode: artifacts.files.reduce((total, file) => 
        total + file.content.split('\n').length, 0),
      quality: artifacts.metadata.quality,
      recommendations: [
        'Review generated security policies',
        'Add comprehensive tests for business logic',
        'Configure monitoring and alerting'
      ]
    };
    
    return {
      success: errors.length === 0,
      report,
      warnings,
      errors
    };
  }
  
  private calculateComplexity(spec: BuilderSpec): number {
    // Simple complexity metric based on entities, actions, and relationships
    const entityCount = spec.entities.length;
    const actionCount = spec.actions.length;
    const relationshipCount = spec.entities.reduce((sum, e) => sum + e.relationships.length, 0);
    const policyCount = spec.policies.length;
    
    return Math.min(100, (entityCount * 5) + (actionCount * 3) + (relationshipCount * 2) + (policyCount * 4));
  }
  
  private extractMetrics(spec: BuilderSpec): any[] {
    const metrics: any[] = [];
    
    // Basic count metrics for each entity
    spec.entities.forEach(entity => {
      metrics.push({
        name: `total_${entity.name.toLowerCase()}`,
        type: 'count',
        entity: entity.name,
        label: `Total ${entity.name}s`,
        description: `Total number of ${entity.name} records`
      });
      
      // Numeric field metrics
      entity.fields.filter(f => f.type === 'number').forEach(field => {
        metrics.push({
          name: `avg_${entity.name.toLowerCase()}_${field.name}`,
          type: 'avg',
          entity: entity.name,
          field: field.name,
          label: `Average ${field.name}`,
          description: `Average ${field.name} for ${entity.name}`
        });
      });
    });
    
    return metrics;
  }
}