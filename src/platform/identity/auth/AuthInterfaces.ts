// ─── Authentication interfaces ──────────────────────────────────────────────────
// Framework-agnostic auth interfaces. JWT, API key, and future OAuth2/OIDC providers
// implement these. Domain code never couples to a specific auth mechanism.

export type AuthMethod = 'JWT' | 'API_KEY' | 'OAUTH2' | 'OIDC' | 'SERVICE_ACCOUNT';

export interface AuthenticatedPrincipal {
  actorId:        string;
  organizationId: string;
  roles:          string[];
  permissions:    string[];
  scopes:         string[];
  authMethod:     AuthMethod;
  sessionId:      string | null;
  expiresAt:      string | null;
}

export interface IAuthenticationProvider {
  authenticate(req: { headers: Record<string, string>; ip?: string; userAgent?: string }): Promise<AuthenticatedPrincipal | null>;
}

export interface ITokenValidator {
  validateToken(token: string): Promise<TokenValidationResult | null>;
  issueToken(payload: TokenPayload): Promise<{ token: string; expiresAt: string }>;
  revokeToken(token: string): Promise<void>;
}

export interface IApiKeyValidator {
  validateApiKey(apiKey: string): Promise<ApiKeyValidationResult | null>;
}

export interface TokenValidationResult {
  actorId:        string;
  organizationId: string;
  roles:          string[];
  sessionId:      string;
  expiresAt:      string;
}

export interface ApiKeyValidationResult {
  apiKeyId:       string;
  actorId:        string;
  organizationId: string;
  scopes:         string[];
}

export interface TokenPayload {
  actorId:        string;
  organizationId: string;
  roles:          string[];
  sessionId:      string;
  expiresInSeconds: number;
}

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface IOAuthProvider {
  readonly providerName: string;
  authenticate(credentials: unknown): Promise<AuthenticatedPrincipal | null>;
}

// Future providers: GoogleOAuthProvider, MicrosoftOAuthProvider, GitHubOAuthProvider, OIDCProvider
