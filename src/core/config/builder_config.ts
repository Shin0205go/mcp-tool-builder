import { z } from 'zod';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';

/**
 * Builder Configuration Schema
 * builder.config.yaml の構造定義
 */
export const BuilderConfigSchema = z.object({
  // Basic settings - name is mandatory for production use
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  
  // Preset configuration
  preset: z.enum(['crm', 'inventory', 'booking', 'support', 'cms', 'ecommerce', 'custom']).optional(),
  
  // Provider configuration
  providers: z.object({
    storage: z.string().default('postgres'),
    queue: z.string().optional(),
    auth: z.string().optional(),
    notify: z.string().optional(),
    search: z.string().optional(),
    payment: z.string().optional(),
    llm: z.string().optional()
  }).default({}),
  
  // UI configuration
  ui: z.object({
    enabled: z.boolean().default(true),
    renderer: z.enum(['rawHtml', 'react', 'vue', 'svelte']).default('rawHtml'),
    origin: z.string().default('https://localhost:3000'),
    theme: z.enum(['default', 'minimal', 'bootstrap', 'tailwind']).default('default')
  }).default({}),
  
  // Generation settings
  generation: z.object({
    templatePack: z.string().default('crud'),
    language: z.enum(['typescript', 'javascript', 'python', 'go']).default('typescript'),
    target: z.enum(['local', 'serverless', 'docker', 'kubernetes']).default('docker'),
    outputDir: z.string().default('./generated'),
    features: z.object({
      crud: z.boolean().default(true),
      workflow: z.boolean().default(false),
      analytics: z.boolean().default(false),
      realtime: z.boolean().default(false),
      auth: z.boolean().default(false),
      search: z.boolean().default(false),
      export: z.boolean().default(false),
      i18n: z.boolean().default(false),
      testing: z.boolean().default(true)
    }).default({})
  }).default({}),
  
  // Internationalization
  i18n: z.object({
    defaultLocale: z.string().default('en'),
    supportedLocales: z.array(z.string()).default(['en']),
    fallbackLocale: z.string().default('en')
  }).default({}),
  
  // Security and compliance policies - SECURE BY DEFAULT
  policies: z.object({
    // PII masking configuration - enabled by default
    piiMask: z.object({
      enabled: z.boolean().default(true),
      fields: z.array(z.string()).default([
        'email', 'phone', 'ssn', 'creditCard', 'address', 'password'
      ]),
      maskChar: z.string().default('*'),
      preserveLength: z.boolean().default(true),
      roles: z.record(z.object({
        unmask: z.array(z.string()).default([])
      })).default({
        'admin': { unmask: ['email'] },
        'user': { unmask: [] }
      })
    }).default({
      enabled: true,
      fields: ['email', 'phone', 'ssn', 'creditCard', 'address', 'password'],
      maskChar: '*',
      preserveLength: true,
      roles: {
        'admin': { unmask: ['email'] },
        'user': { unmask: [] }
      }
    }),
    
    // RBAC configuration - enabled by default with basic roles
    rbac: z.object({
      enabled: z.boolean().default(true),
      roles: z.array(z.object({
        name: z.string(),
        permissions: z.array(z.string()),
        description: z.string().optional()
      })).default([
        { name: 'admin', permissions: ['*'], description: 'Full system access' },
        { name: 'user', permissions: ['read'], description: 'Read-only access' }
      ])
    }).default({
      enabled: true,
      roles: [
        { name: 'admin', permissions: ['*'], description: 'Full system access' },
        { name: 'user', permissions: ['read'], description: 'Read-only access' }
      ]
    }),
    
    // Rate limiting - enabled by default with conservative limits
    rateLimit: z.object({
      enabled: z.boolean().default(true),
      windowMs: z.number().default(60000), // 1 minute
      max: z.number().default(60), // 1 request per second average
      skipSuccessfulRequests: z.boolean().default(false)
    }).default({
      enabled: true,
      windowMs: 60000,
      max: 60,
      skipSuccessfulRequests: false
    }),
    
    // Input validation - strict by default
    validation: z.object({
      strict: z.boolean().default(true),
      sanitize: z.boolean().default(true),
      maxStringLength: z.number().default(1000), // More conservative limit
      maxArrayLength: z.number().default(100) // More conservative limit
    }).default({
      strict: true,
      sanitize: true,
      maxStringLength: 1000,
      maxArrayLength: 100
    })
  }).default({
    piiMask: {
      enabled: true,
      fields: ['email', 'phone', 'ssn', 'creditCard', 'address', 'password'],
      maskChar: '*',
      preserveLength: true,
      roles: {
        'admin': { unmask: ['email'] },
        'user': { unmask: [] }
      }
    },
    rbac: {
      enabled: true,
      roles: [
        { name: 'admin', permissions: ['*'], description: 'Full system access' },
        { name: 'user', permissions: ['read'], description: 'Read-only access' }
      ]
    },
    rateLimit: {
      enabled: true,
      windowMs: 60000,
      max: 60,
      skipSuccessfulRequests: false
    },
    validation: {
      strict: true,
      sanitize: true,
      maxStringLength: 1000,
      maxArrayLength: 100
    }
  }),
  
  // Database configuration
  database: z.object({
    migrations: z.object({
      directory: z.string().default('./migrations'),
      tableName: z.string().default('migrations'),
      autoRun: z.boolean().default(false)
    }).default({}),
    
    connection: z.object({
      host: z.string().optional(),
      port: z.number().optional(),
      database: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      ssl: z.boolean().optional(),
      connectionString: z.string().optional()
    }).optional(),
    
    pool: z.object({
      min: z.number().default(0),
      max: z.number().default(10),
      acquireTimeoutMillis: z.number().default(60000),
      idleTimeoutMillis: z.number().default(30000)
    }).default({})
  }).default({}),
  
  // Monitoring and observability
  monitoring: z.object({
    enabled: z.boolean().default(false),
    metrics: z.object({
      enabled: z.boolean().default(true),
      port: z.number().default(9090),
      path: z.string().default('/metrics')
    }).default({}),
    
    logging: z.object({
      level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      format: z.enum(['json', 'text']).default('json'),
      destination: z.enum(['console', 'file', 'remote']).default('console')
    }).default({}),
    
    tracing: z.object({
      enabled: z.boolean().default(false),
      serviceName: z.string().optional(),
      endpoint: z.string().optional()
    }).default({})
  }).default({}),
  
  // Development settings
  development: z.object({
    hotReload: z.boolean().default(false),
    debugMode: z.boolean().default(false),
    mockProviders: z.boolean().default(false),
    seedData: z.boolean().default(false)
  }).default({}),
  
  // Custom extensions
  extensions: z.record(z.any()).default({}),
  
  // Environment-specific overrides
  environments: z.record(z.any()).default({})
});

export type BuilderConfig = z.infer<typeof BuilderConfigSchema>;

/**
 * Configuration Manager
 */
export class ConfigManager {
  private config: BuilderConfig | null = null;
  
  /**
   * 設定ファイルを読み込み
   */
  async load(configPath?: string): Promise<BuilderConfig> {
    const paths = [
      configPath,
      './builder.config.yaml',
      './builder.config.yml',
      './config/builder.yaml',
      './config/builder.yml'
    ].filter(Boolean);
    
    for (const path of paths) {
      if (!path) continue;
      try {
        const content = await fs.readFile(path, 'utf-8');
        const rawConfig = yaml.load(content);
        this.config = BuilderConfigSchema.parse(rawConfig);
        return this.config;
      } catch (error) {
        // Continue to next path
        continue;
      }
    }
    
    // No config file found, use defaults
    this.config = BuilderConfigSchema.parse({});
    return this.config;
  }
  
  /**
   * 設定を保存
   */
  async save(config: BuilderConfig, path: string = './builder.config.yaml'): Promise<void> {
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    
    await fs.writeFile(path, yamlContent, 'utf-8');
  }
  
  /**
   * 現在の設定を取得
   */
  get(): BuilderConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }
  
  /**
   * 環境変数で設定をオーバーライド
   */
  applyEnvironmentOverrides(config: BuilderConfig): BuilderConfig {
    const overrides: Partial<BuilderConfig> = {};
    
    // Database connection string from env
    if (process.env.DATABASE_URL) {
      overrides.database = {
        ...config.database,
        connection: {
          ...config.database?.connection,
          connectionString: process.env.DATABASE_URL
        }
      };
    }
    
    // UI origin from env
    if (process.env.UI_ORIGIN) {
      overrides.ui = {
        ...config.ui,
        origin: process.env.UI_ORIGIN
      };
    }
    
    // Debug mode from env
    if (process.env.DEBUG === 'true') {
      overrides.development = {
        ...config.development,
        debugMode: true
      };
    }
    
    // Log level from env
    if (process.env.LOG_LEVEL) {
      overrides.monitoring = {
        ...config.monitoring,
        logging: {
          ...config.monitoring?.logging,
          level: process.env.LOG_LEVEL as any
        }
      };
    }
    
    return { ...config, ...overrides };
  }
  
  /**
   * プリセット設定を適用
   */
  applyPreset(config: BuilderConfig): BuilderConfig {
    if (!config.preset) return config;
    
    const presets: Record<string, Partial<BuilderConfig>> = {
      crm: {
        generation: {
          ...config.generation,
          features: {
            crud: true,
            workflow: true,
            analytics: true,
            auth: true,
            search: true,
            export: true,
            i18n: false,
            realtime: false,
            testing: true
          }
        },
        providers: {
          storage: 'postgres',
          queue: 'redis',
          auth: 'oidc',
          search: 'elasticsearch'
        },
        policies: {
          validation: {
            strict: true,
            sanitize: true,
            maxStringLength: 10000,
            maxArrayLength: 1000
          },
          piiMask: {
            enabled: true,
            fields: ['Customer.email', 'Customer.phone', 'Contact.email'],
            maskChar: '*',
            preserveLength: true,
            roles: {
              'Admin': { unmask: ['Customer.email'] },
              'Sales': { unmask: ['Customer.email'] },
              'Support': { unmask: [] }
            }
          },
          rbac: {
            enabled: true,
            roles: [
              { name: 'Admin', permissions: ['*'], description: 'Full access' },
              { name: 'Sales', permissions: ['Customer.*', 'Contact.*'], description: 'Sales team access' },
              { name: 'Support', permissions: ['Customer.read', 'Ticket.*'], description: 'Support team access' }
            ]
          },
          rateLimit: {
            enabled: true,
            windowMs: 60000,
            max: 200, // Higher limit for CRM systems
            skipSuccessfulRequests: false
          }
        }
      },
      
      inventory: {
        generation: {
          ...config.generation,
          features: {
            crud: true,
            workflow: false,
            analytics: true,
            auth: true,
            search: true,
            export: true,
            i18n: false,
            realtime: true,
            testing: true
          }
        },
        providers: {
          storage: 'postgres',
          queue: 'redis',
          auth: 'jwt'
        }
      },
      
      booking: {
        generation: {
          ...config.generation,
          features: {
            crud: true,
            workflow: true,
            analytics: false,
            auth: true,
            search: true,
            export: false,
            i18n: true,
            realtime: true,
            testing: true
          }
        },
        providers: {
          storage: 'postgres',
          queue: 'redis',
          auth: 'oauth',
          notify: 'email'
        }
      },
      
      ecommerce: {
        generation: {
          ...config.generation,
          features: {
            crud: true,
            workflow: true,
            analytics: true,
            auth: true,
            search: true,
            export: true,
            i18n: true,
            realtime: false,
            testing: true
          }
        },
        providers: {
          storage: 'postgres',
          queue: 'redis',
          auth: 'oauth',
          payment: 'stripe',
          search: 'elasticsearch',
          notify: 'email'
        },
        policies: {
          validation: {
            strict: true,
            sanitize: true,
            maxStringLength: 10000,
            maxArrayLength: 1000
          },
          piiMask: {
            enabled: true,
            fields: ['Customer.email', 'Customer.phone', 'Order.billingAddress'],
            maskChar: '*',
            preserveLength: true,
            roles: {
              'admin': { unmask: ['Customer.email'] },
              'customer-service': { unmask: ['Customer.email'] },
              'user': { unmask: [] }
            }
          },
          rbac: {
            enabled: true,
            roles: [
              { name: 'admin', permissions: ['*'], description: 'Full system access' },
              { name: 'customer-service', permissions: ['Order.*', 'Customer.read'], description: 'Customer service access' },
              { name: 'customer', permissions: ['Order.read', 'Customer.update'], description: 'Customer access' }
            ]
          },
          rateLimit: {
            enabled: true,
            windowMs: 60000,
            max: 1000,
            skipSuccessfulRequests: false
          }
        }
      }
    };
    
    const preset = presets[config.preset];
    if (preset) {
      return this.deepMerge(config, preset);
    }
    
    return config;
  }
  
  /**
   * 深いマージ
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  /**
   * 設定を検証
   */
  validate(config: unknown): BuilderConfig {
    return BuilderConfigSchema.parse(config);
  }

  /**
   * Production環境向けの厳密な検証
   */
  validateProduction(config: unknown): BuilderConfig {
    const validatedConfig = this.validate(config);
    const errors: string[] = [];

    // Mandatory fields for production
    if (!validatedConfig.name || validatedConfig.name.trim() === '') {
      errors.push('Project name is required for production deployment');
    }

    if (!validatedConfig.description) {
      errors.push('Project description is recommended for production');
    }

    // Security validations
    if (validatedConfig.policies.rbac?.enabled && 
        (!validatedConfig.policies.rbac.roles || validatedConfig.policies.rbac.roles.length === 0)) {
      errors.push('RBAC is enabled but no roles are defined');
    }

    if (validatedConfig.policies.piiMask?.enabled && 
        (!validatedConfig.policies.piiMask.fields || validatedConfig.policies.piiMask.fields.length === 0)) {
      errors.push('PII masking is enabled but no fields are specified');
    }

    // Provider validations
    if (validatedConfig.providers.storage && 
        !['postgres', 'mysql', 'mongodb', 'sqlite'].includes(validatedConfig.providers.storage)) {
      errors.push(`Unknown storage provider: ${validatedConfig.providers.storage}`);
    }

    if (validatedConfig.providers.queue && 
        !['redis', 'sqs', 'pubsub', 'memory'].includes(validatedConfig.providers.queue)) {
      errors.push(`Unknown queue provider: ${validatedConfig.providers.queue}`);
    }

    // UI origin validation
    if (validatedConfig.ui.enabled && validatedConfig.ui.origin) {
      try {
        new URL(validatedConfig.ui.origin);
      } catch {
        errors.push('UI origin must be a valid URL');
      }

      if (validatedConfig.ui.origin.startsWith('http://') && 
          !validatedConfig.ui.origin.includes('localhost')) {
        errors.push('HTTP origins are not secure for production. Use HTTPS or localhost only.');
      }
    }

    // Database connection validation
    if (validatedConfig.database.connection?.connectionString) {
      if (validatedConfig.database.connection.connectionString.includes('localhost') &&
          process.env.NODE_ENV === 'production') {
        errors.push('Database connection uses localhost in production environment');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Production validation failed:\n${errors.map(e => `- ${e}`).join('\n')}`);
    }

    return validatedConfig;
  }

  /**
   * 設定の整合性をチェック
   */
  validateConsistency(config: BuilderConfig): string[] {
    const warnings: string[] = [];

    // Feature consistency checks
    if (config.generation.features.workflow && !config.providers.queue) {
      warnings.push('Workflow features enabled but no queue provider configured');
    }

    if (config.generation.features.auth && !config.providers.auth) {
      warnings.push('Auth features enabled but no auth provider configured');
    }

    if (config.generation.features.search && !config.providers.search) {
      warnings.push('Search features enabled but no search provider configured');
    }

    if (config.generation.features.analytics && !config.monitoring.enabled) {
      warnings.push('Analytics features enabled but monitoring is disabled');
    }

    // Security consistency checks
    if (config.ui.enabled && !config.policies.validation.strict) {
      warnings.push('UI is enabled but strict validation is disabled - security risk');
    }

    if (config.providers.payment && !config.policies.rbac?.enabled) {
      warnings.push('Payment provider configured but RBAC is not enabled - security risk');
    }

    // Performance consistency checks
    if (config.generation.features.realtime && config.database.pool.max < 20) {
      warnings.push('Realtime features enabled but database pool size is small - consider increasing');
    }

    return warnings;
  }
  
  /**
   * デフォルト設定ファイルを生成
   */
  async generateDefault(path: string = './builder.config.yaml'): Promise<void> {
    const defaultConfig = BuilderConfigSchema.parse({
      name: 'my-mcp-tool',
      description: 'Generated MCP tool',
      preset: 'custom',
      providers: {
        storage: 'postgres'
      },
      ui: {
        enabled: true,
        renderer: 'rawHtml',
        origin: 'https://localhost:3000'
      },
      generation: {
        templatePack: 'crud',
        language: 'typescript',
        target: 'docker'
      }
    });
    
    await this.save(defaultConfig, path);
  }
}

export const configManager = new ConfigManager();