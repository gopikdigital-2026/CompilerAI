// ─── Identity layer — public API barrel ─────────────────────────────────────────

// ── Errors ──────────────────────────────────────────────────────────────────────
export {
  IdentityError, AuthenticationError, InvalidCredentialsError,
  TokenExpiredError, TokenInvalidError, ApiKeyInvalidError, ApiKeyRevokedError,
  ApiKeyExpiredError, AuthorizationError, InsufficientPermissionsError,
  WrongOrganizationError, AccountLockedError, AccountSuspendedError,
  AccountDisabledError, OrganizationSuspendedError, InvitationExpiredError,
  InvitationRevokedError, SessionExpiredError, PrivilegeEscalationError,
  toSafeIdentityMessage, isIdentityError,
} from './errors/IdentityErrors';

// ── Permissions ─────────────────────────────────────────────────────────────────
export {
  PERMISSIONS, ALL_PERMISSION_NAMES, getPermission, isValidPermission,
  getPermissionsByResource, PermissionSet,
} from './permissions/Permissions';
export type { Permission } from './permissions/Permissions';

// ── Roles ───────────────────────────────────────────────────────────────────────
export {
  SYSTEM_ROLE_NAMES, SYSTEM_ROLE_PERMISSIONS, getRolePermissions,
  isSystemRole, isPlatformAdminRole, isOrgAdminRole,
} from './roles/Roles';
export type { SystemRoleName, RoleDefinition } from './roles/Roles';

// ── Organizations ───────────────────────────────────────────────────────────────
export {
  DEFAULT_ORG_SETTINGS, PLAN_LIMITS,
} from './organizations/OrganizationModels';
export type {
  Organization, OrganizationSettings, OrganizationLimits,
  OrganizationStatus, OrganizationPlan,
} from './organizations/OrganizationModels';

// ── Users ───────────────────────────────────────────────────────────────────────
export { DEFAULT_USER_PREFERENCES } from './users/UserModels';
export type {
  UserProfile, User, UserStatus, UserPreferences, UserRoleAssignment, Invitation,
} from './users/UserModels';

// ── API Keys ────────────────────────────────────────────────────────────────────
export { ALL_API_KEY_SCOPES, isValidScope, validateScopes, hasScope } from './api-keys/ApiKeyModels';
export type { ApiKey, ApiKeyScope, ApiKeyWithSecret } from './api-keys/ApiKeyModels';

// ── Sessions ────────────────────────────────────────────────────────────────────
export { isSessionActive, getSessionStatus } from './sessions/SessionModels';
export type { Session, SessionStatus } from './sessions/SessionModels';

// ── Auth ────────────────────────────────────────────────────────────────────────
export type {
  AuthMethod, AuthenticatedPrincipal, IAuthenticationProvider,
  ITokenValidator, IApiKeyValidator, TokenValidationResult, ApiKeyValidationResult,
  TokenPayload, IPasswordHasher, IOAuthProvider,
} from './auth/AuthInterfaces';
export {
  PBKDF2PasswordHasher, sha256Hex, verifyHash,
} from './auth/PasswordHasher';
export { JwtTokenValidator } from './auth/JwtAuthenticationProvider';
export { ApiKeyValidator } from './auth/ApiKeyAuthenticationProvider';
export { CompositeAuthenticationProvider } from './auth/CompositeAuthenticationProvider';

// ── Authorization ───────────────────────────────────────────────────────────────
export type {
  IAuthorizationService, IRolePermissionResolver, IPolicyEvaluator,
  IResourcePermissionChecker, PolicyContext, PolicyDecision,
} from './authorization/AuthorizationInterfaces';
export {
  AuthorizationService, DefaultPolicyEvaluator, PrivilegeGuard,
} from './authorization/AuthorizationService';

// ── Repositories ────────────────────────────────────────────────────────────────
export type {
  IOrganizationRepository, IUserRepository, IRoleRepository, IUserRoleRepository,
  IApiKeyRepository, ISessionRepository, IInvitationRepository, ILoginAttemptRepository,
} from './repositories/RepositoryInterfaces';
export {
  InMemoryOrganizationRepository, InMemoryUserRepository, InMemoryRoleRepository,
  InMemoryUserRoleRepository, InMemoryApiKeyRepository, InMemorySessionRepository,
  InMemoryInvitationRepository, InMemoryLoginAttemptRepository,
} from './repositories/InMemoryRepositories';

// ── Services ────────────────────────────────────────────────────────────────────
export { OrganizationService } from './services/OrganizationService';
export { UserService } from './services/UserService';
export { ApiKeyService } from './services/ApiKeyService';
export { SessionManager } from './services/SessionManager';
export { RolePermissionResolver } from './services/RolePermissionResolver';

// ── Middleware ───────────────────────────────────────────────────────────────────
export {
  AuthenticationMiddleware, AuthorizationMiddleware, OrganizationContextMiddleware,
  PermissionMiddleware, AuditMiddleware,
} from './middleware/IdentityMiddleware';
export type {
  IdentityRequest, IdentityContext, IdentityMiddlewareResult, AuditEntry,
} from './middleware/IdentityMiddleware';

// ── DTOs ────────────────────────────────────────────────────────────────────────
export type {
  CreateOrganizationDto, UpdateOrganizationDto, OrganizationResponseDto,
  InviteUserDto, UpdateUserDto, UserProfileResponseDto,
  CreateApiKeyDto, ApiKeyResponseDto, ApiKeyWithSecretDto,
  LoginDto, LoginResponseDto, AssignRoleDto, CreateCustomRoleDto, RoleResponseDto,
  AcceptInvitationDto,
} from './dto/IdentityDtos';

// ── Policies ────────────────────────────────────────────────────────────────────
export {
  OrganizationPolicyEvaluator, PrivilegeEscalationPolicyEvaluator,
  SuspendedOrganizationPolicyEvaluator,
} from './policies/IdentityPolicies';
