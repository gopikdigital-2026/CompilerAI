import type { UserService } from '../users/UserService';
import type { SessionService } from '../sessions/SessionService';
import type { ApiKeyService } from '../api-keys/ApiKeyService';
import type { AuditService } from '../audit/AuditService';
import type { AuthorizationService, AuthContext } from '../authorization/AuthorizationService';
import type { Session } from '../sessions/SessionModels';
import type { User } from '../users/UserModels';
import { AuthenticationError } from '../adapters/IdentityErrors';

export interface LoginRequest {
  email: string;
  password: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  user: User;
  session: Session;
  rawToken: string;
  authContext: AuthContext;
}

export interface AuthenticatedPrincipal {
  type: 'USER' | 'API_KEY';
  userId?: string;
  apiKeyId?: string;
  organizationId: string;
  authContext: AuthContext;
}

export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly apiKeyService: ApiKeyService,
    private readonly auditService: AuditService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async login(request: LoginRequest): Promise<LoginResult> {
    const user = await this.userService.findByEmail(request.email, request.organizationId);
    if (!user) {
      await this.auditService.record({
        organizationId: request.organizationId,
        action: 'LOGIN',
        actorId: 'unknown',
        actorType: 'SYSTEM',
        targetType: 'USER',
        targetId: 'unknown',
        severity: 'HIGH',
        detail: { reason: 'User not found', email: request.email },
        success: false,
      });
      throw new AuthenticationError('Invalid credentials');
    }

    const passwordValid = await this.userService.verifyPassword(user.id, request.password);
    if (!passwordValid) {
      await this.userService.recordFailedLogin(user.id);
      await this.auditService.record({
        organizationId: request.organizationId,
        action: 'LOGIN',
        actorId: user.id,
        actorType: 'USER',
        targetType: 'USER',
        targetId: user.id,
        severity: 'HIGH',
        detail: { reason: 'Invalid password' },
        success: false,
      });
      throw new AuthenticationError('Invalid credentials');
    }

    const activeUser = await this.userService.recordSuccessfulLogin(user.id);
    const { session, rawToken } = await this.sessionService.create({
      userId: user.id,
      organizationId: request.organizationId,
      authMethod: 'PASSWORD',
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    });

    const authContext = await this.authorizationService.buildContext(activeUser);

    await this.auditService.record({
      organizationId: request.organizationId,
      action: 'LOGIN',
      actorId: user.id,
      actorType: 'USER',
      targetType: 'SESSION',
      targetId: session.id,
      severity: 'LOW',
      detail: { session_id: session.id },
      success: true,
    });

    return { user: activeUser, session, rawToken, authContext };
  }

  async logout(sessionId: string, organizationId: string): Promise<void> {
    await this.sessionService.revoke(sessionId, 'User logged out');
    await this.auditService.record({
      organizationId,
      action: 'LOGOUT',
      actorId: 'system',
      actorType: 'SYSTEM',
      targetType: 'SESSION',
      targetId: sessionId,
      severity: 'LOW',
      detail: {},
      success: true,
    });
  }

  async authenticateWithApiKey(rawKey: string): Promise<AuthenticatedPrincipal> {
    const apiKey = await this.apiKeyService.authenticate(rawKey);

    const creator = await this.userService.findById(apiKey.createdByUserId);
    const authContext = await this.authorizationService.buildContext(creator);
    authContext.authMethod = 'API_KEY';

    await this.auditService.record({
      organizationId: apiKey.organizationId,
      action: 'API_KEY_USED',
      actorId: apiKey.id,
      actorType: 'API_KEY',
      targetType: 'API_KEY',
      targetId: apiKey.id,
      severity: 'LOW',
      detail: { key_name: apiKey.name },
      success: true,
    });

    return {
      type: 'API_KEY',
      apiKeyId: apiKey.id,
      organizationId: apiKey.organizationId,
      authContext,
    };
  }

  async authenticateWithSession(rawToken: string): Promise<AuthenticatedPrincipal> {
    const session = await this.sessionService.findByToken(rawToken);
    const user = await this.userService.findById(session.userId);
    const authContext = await this.authorizationService.buildContext(user);
    authContext.authMethod = 'SESSION';

    return {
      type: 'USER',
      userId: user.id,
      organizationId: session.organizationId,
      authContext,
    };
  }
}
