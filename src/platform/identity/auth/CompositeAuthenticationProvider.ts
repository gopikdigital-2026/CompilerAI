// ─── Composite Authentication Provider ──────────────────────────────────────────
// Tries API key first, then JWT token. Future: OAuth2 / OIDC.

import type {
  IAuthenticationProvider, AuthenticatedPrincipal,
  IApiKeyValidator, ITokenValidator,
} from './AuthInterfaces';
import type { IRolePermissionResolver } from '../authorization/AuthorizationInterfaces';
import { AuthenticationError } from '../errors/IdentityErrors';

export class CompositeAuthenticationProvider implements IAuthenticationProvider {
  constructor(
    private readonly apiKeyValidator: IApiKeyValidator,
    private readonly tokenValidator: ITokenValidator,
    private readonly rolePermissionResolver: IRolePermissionResolver,
  ) {}

  async authenticate(req: { headers: Record<string, string>; ip?: string; userAgent?: string }): Promise<AuthenticatedPrincipal | null> {
    const headers = req.headers;
    const apiKeyHeader = headers['x-api-key'] ?? headers['x-api-key'.toLowerCase()];
    if (apiKeyHeader) {
      const result = await this.apiKeyValidator.validateApiKey(apiKeyHeader);
      if (result) {
        const permissions = await this.rolePermissionResolver.resolvePermissions(result.actorId, result.organizationId);
        return {
          actorId: result.actorId,
          organizationId: result.organizationId,
          roles: [],
          permissions,
          scopes: result.scopes,
          authMethod: 'API_KEY',
          sessionId: null,
          expiresAt: null,
        };
      }
      throw new AuthenticationError('Invalid API key');
    }

    const authHeader = headers['authorization'] ?? headers['Authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const result = await this.tokenValidator.validateToken(token);
      if (result) {
        const permissions = await this.rolePermissionResolver.resolvePermissions(result.actorId, result.organizationId);
        return {
          actorId: result.actorId,
          organizationId: result.organizationId,
          roles: result.roles,
          permissions,
          scopes: [],
          authMethod: 'JWT',
          sessionId: result.sessionId,
          expiresAt: result.expiresAt,
        };
      }
      throw new AuthenticationError('Invalid or expired token');
    }

    return null;
  }
}
