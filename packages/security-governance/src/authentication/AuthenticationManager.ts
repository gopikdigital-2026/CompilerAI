import type { AuthCredential, AuthMethod, AuthResult, IAuthProvider } from '../models.js';
import type { IdentityManager } from '../identity/IdentityManager.js';

export class MockAuthProvider implements IAuthProvider {
  readonly method: AuthMethod = 'mock';
  private readonly identityManager: IdentityManager;
  private readonly tokens = new Map<string, { identityId: string; expiresAt: string }>();

  constructor(identityManager: IdentityManager) {
    this.identityManager = identityManager;
  }

  async authenticate(credentials: AuthCredential): Promise<AuthResult> {
    const identity = this.identityManager.get(credentials.identityId);
    if (!identity) {
      return { authenticated: false, method: this.method, error: 'Identity not found', metadata: {} };
    }
    if (identity.status !== 'active') {
      return { authenticated: false, method: this.method, error: 'Identity is not active', metadata: {} };
    }
    if (!credentials.token) {
      return { authenticated: false, method: this.method, error: 'No token provided', metadata: {} };
    }

    const token = `mock-token-${credentials.identityId}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    this.tokens.set(token, { identityId: credentials.identityId, expiresAt });

    return {
      authenticated: true,
      identityId: credentials.identityId,
      method: this.method,
      token,
      expiresAt,
      metadata: { organizationId: identity.organizationId },
    };
  }

  async validateToken(token: string): Promise<AuthResult> {
    const entry = this.tokens.get(token);
    if (!entry) {
      return { authenticated: false, method: this.method, error: 'Invalid token', metadata: {} };
    }
    if (new Date(entry.expiresAt) < new Date()) {
      this.tokens.delete(token);
      return { authenticated: false, method: this.method, error: 'Token expired', metadata: {} };
    }
    const identity = this.identityManager.get(entry.identityId);
    if (!identity || identity.status !== 'active') {
      return { authenticated: false, method: this.method, error: 'Identity invalid', metadata: {} };
    }
    return {
      authenticated: true,
      identityId: entry.identityId,
      method: this.method,
      token,
      expiresAt: entry.expiresAt,
      metadata: { organizationId: identity.organizationId },
    };
  }

  async refreshToken(token: string): Promise<AuthResult> {
    const entry = this.tokens.get(token);
    if (!entry) {
      return { authenticated: false, method: this.method, error: 'Invalid token for refresh', metadata: {} };
    }
    const newExpiresAt = new Date(Date.now() + 3600_000).toISOString();
    this.tokens.set(token, { ...entry, expiresAt: newExpiresAt });
    return {
      authenticated: true,
      identityId: entry.identityId,
      method: this.method,
      token,
      expiresAt: newExpiresAt,
      metadata: {},
    };
  }

  revokeToken(token: string): boolean {
    return this.tokens.delete(token);
  }
}

export class AuthenticationManager {
  private readonly providers = new Map<AuthMethod, IAuthProvider>();
  private readonly defaultProvider: IAuthProvider;

  constructor(identityManager: IdentityManager) {
    this.defaultProvider = new MockAuthProvider(identityManager);
    this.providers.set('mock', this.defaultProvider);
  }

  registerProvider(provider: IAuthProvider): void {
    this.providers.set(provider.method, provider);
  }

  getProvider(method: AuthMethod): IAuthProvider | undefined {
    return this.providers.get(method);
  }

  async authenticate(credential: AuthCredential): Promise<AuthResult> {
    const provider = this.providers.get(credential.method) ?? this.defaultProvider;
    return provider.authenticate(credential);
  }

  async validateToken(token: string, method: AuthMethod = 'mock'): Promise<AuthResult> {
    const provider = this.providers.get(method) ?? this.defaultProvider;
    return provider.validateToken(token);
  }

  async refreshToken(token: string, method: AuthMethod = 'mock'): Promise<AuthResult> {
    const provider = this.providers.get(method) ?? this.defaultProvider;
    return provider.refreshToken(token);
  }

  getSupportedMethods(): AuthMethod[] {
    return Array.from(this.providers.keys());
  }
}
