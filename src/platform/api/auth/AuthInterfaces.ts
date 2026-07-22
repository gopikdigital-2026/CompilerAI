// ─── Authentication interfaces ──────────────────────────────────────────────────

export interface AuthenticatedPrincipal {
  actorId:        string;
  organizationId: string;
  roles:          string[];
  permissions:    string[];
  authMethod:     'API_KEY' | 'JWT' | 'OAUTH2' | 'SERVICE_ACCOUNT';
}

export interface IAuthenticationProvider {
  authenticate(req: { headers: Record<string, string> }): Promise<AuthenticatedPrincipal | null>;
}

export interface IApiKeyValidator {
  validateApiKey(apiKey: string): Promise<{ actorId: string; organizationId: string; roles: string[] } | null>;
}

export interface ITokenValidator {
  validateToken(token: string): Promise<{ actorId: string; organizationId: string; roles: string[] } | null>;
}

// ── Simulated API key validator ────────────────────────────────────────────────

export class SimulatedApiKeyValidator implements IApiKeyValidator {
  private readonly keys = new Map<string, { actorId: string; organizationId: string; roles: string[] }>();

  addKey(apiKey: string, actorId: string, organizationId: string, roles: string[]): void {
    this.keys.set(apiKey, { actorId, organizationId, roles });
  }

  async validateApiKey(apiKey: string): Promise<{ actorId: string; organizationId: string; roles: string[] } | null> {
    return this.keys.get(apiKey) ?? null;
  }
}

// ── Simulated token validator ──────────────────────────────────────────────────

export class SimulatedTokenValidator implements ITokenValidator {
  private readonly tokens = new Map<string, { actorId: string; organizationId: string; roles: string[] }>();

  addToken(token: string, actorId: string, organizationId: string, roles: string[]): void {
    this.tokens.set(token, { actorId, organizationId, roles });
  }

  async validateToken(token: string): Promise<{ actorId: string; organizationId: string; roles: string[] } | null> {
    return this.tokens.get(token) ?? null;
  }
}

// ── Simulated authentication provider ──────────────────────────────────────────

export class SimulatedAuthenticationProvider implements IAuthenticationProvider {
  private readonly apiKeyValidator: SimulatedApiKeyValidator;
  private readonly tokenValidator: SimulatedTokenValidator;

  constructor() {
    this.apiKeyValidator = new SimulatedApiKeyValidator();
    this.tokenValidator = new SimulatedTokenValidator();
  }

  addApiKey(apiKey: string, actorId: string, organizationId: string, roles: string[]): void {
    this.apiKeyValidator.addKey(apiKey, actorId, organizationId, roles);
  }

  addToken(token: string, actorId: string, organizationId: string, roles: string[]): void {
    this.tokenValidator.addToken(token, actorId, organizationId, roles);
  }

  async authenticate(req: { headers: Record<string, string> }): Promise<AuthenticatedPrincipal | null> {
    // Try API key first
    const apiKey = req.headers['x-api-key'] ?? req.headers['authorization']?.replace('Bearer ', '');
    if (apiKey) {
      const keyResult = await this.apiKeyValidator.validateApiKey(apiKey);
      if (keyResult) {
        return {
          actorId: keyResult.actorId,
          organizationId: keyResult.organizationId,
          roles: keyResult.roles,
          permissions: rolesToPermissions(keyResult.roles),
          authMethod: 'API_KEY',
        };
      }
    }

    // Try JWT token
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const tokenResult = await this.tokenValidator.validateToken(token);
      if (tokenResult) {
        return {
          actorId: tokenResult.actorId,
          organizationId: tokenResult.organizationId,
          roles: tokenResult.roles,
          permissions: rolesToPermissions(tokenResult.roles),
          authMethod: 'JWT',
        };
      }
    }

    return null;
  }
}

// ── Role to permission mapping ─────────────────────────────────────────────────

function rolesToPermissions(roles: string[]): string[] {
  const perms = new Set<string>();
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (rolePerms) rolePerms.forEach(p => perms.add(p));
  }
  return Array.from(perms);
}

export type ApiRole = 'PLATFORM_ADMIN' | 'ORGANIZATION_ADMIN' | 'WORKFLOW_EDITOR' | 'EXECUTION_OPERATOR' | 'APPROVER' | 'VIEWER';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  PLATFORM_ADMIN: ['execution:create', 'execution:read', 'execution:pause', 'execution:resume', 'execution:cancel', 'workflow:create', 'workflow:read', 'workflow:publish', 'approval:read', 'approval:decide', 'telemetry:read'],
  ORGANIZATION_ADMIN: ['execution:create', 'execution:read', 'execution:pause', 'execution:resume', 'execution:cancel', 'workflow:create', 'workflow:read', 'workflow:publish', 'approval:read', 'approval:decide', 'telemetry:read'],
  WORKFLOW_EDITOR: ['workflow:create', 'workflow:read', 'workflow:publish'],
  EXECUTION_OPERATOR: ['execution:create', 'execution:read', 'execution:pause', 'execution:resume', 'execution:cancel', 'telemetry:read'],
  APPROVER: ['approval:read', 'approval:decide', 'execution:read'],
  VIEWER: ['execution:read', 'workflow:read', 'approval:read', 'telemetry:read'],
};

export const ALL_PERMISSIONS = [
  'execution:create', 'execution:read', 'execution:pause', 'execution:resume', 'execution:cancel',
  'workflow:create', 'workflow:read', 'workflow:publish',
  'approval:read', 'approval:decide',
  'telemetry:read',
] as const;
