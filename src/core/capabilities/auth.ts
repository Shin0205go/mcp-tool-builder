/**
 * Auth Provider Interface
 * 認証、認可、セキュリティポリシーの抽象化
 */
export interface AuthProvider {
  name: string;
  
  /**
   * ユーザーを認証
   */
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  
  /**
   * トークンを検証
   */
  validateToken(token: string): Promise<AuthUser | null>;
  
  /**
   * トークンを無効化
   */
  revokeToken(token: string): Promise<boolean>;
  
  /**
   * ユーザーの権限を確認
   */
  authorize(user: AuthUser, action: string, resource?: string): Promise<boolean>;
  
  /**
   * ロールベースの権限チェック
   */
  hasRole(user: AuthUser, role: string): Promise<boolean>;
  
  /**
   * 属性ベースの権限チェック
   */
  checkPolicy(user: AuthUser, policy: AuthPolicy): Promise<boolean>;
  
  /**
   * PIIデータをマスク
   */
  maskPII(data: any, user: AuthUser, context: string): Promise<any>;
  
  /**
   * 監査ログを記録
   */
  audit(event: AuditEvent): Promise<void>;
  
  /**
   * 初期化処理
   */
  initialize(config: AuthConfig): Promise<void>;
  
  /**
   * 終了処理
   */
  dispose(): Promise<void>;
}

export interface AuthCredentials {
  type: 'password' | 'apikey' | 'oauth' | 'jwt' | 'session';
  username?: string;
  password?: string;
  apiKey?: string;
  token?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
  expiresAt?: Date;
  refreshToken?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  roles: string[];
  attributes: Record<string, any>;
  permissions: string[];
  metadata: Record<string, any>;
}

export interface AuthPolicy {
  type: 'rbac' | 'abac' | 'custom';
  conditions: PolicyCondition[];
}

export interface PolicyCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'regex';
  value: any;
}

export interface AuditEvent {
  userId: string;
  action: string;
  resource?: string;
  result: 'success' | 'failure' | 'blocked';
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuthConfig {
  provider: string;
  options: Record<string, any>;
  tokenExpiry?: number;
  refreshTokenExpiry?: number;
  policies?: AuthPolicy[];
  piiMasking?: PIIMaskingConfig;
}

export interface PIIMaskingConfig {
  enabled: boolean;
  fields: string[];
  maskChar: string;
  preserveLength: boolean;
  roles?: {
    [role: string]: {
      unmask: string[];
    };
  };
}

/**
 * Auth Provider Registry
 */
export class AuthProviderRegistry {
  private providers = new Map<string, () => Promise<AuthProvider>>();
  
  register(name: string, factory: () => Promise<AuthProvider>): void {
    this.providers.set(name, factory);
  }
  
  async create(name: string, config: AuthConfig): Promise<AuthProvider> {
    const factory = this.providers.get(name);
    if (!factory) {
      throw new Error(`Auth provider '${name}' not found`);
    }
    
    const provider = await factory();
    await provider.initialize(config);
    return provider;
  }
  
  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const authRegistry = new AuthProviderRegistry();