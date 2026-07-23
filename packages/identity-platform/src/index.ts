export { IdentityPlatform } from './IdentityPlatform';
export type { IdentityPlatformDeps } from './IdentityPlatform';

export { OrganizationService } from './organizations/OrganizationService';
export type { CreateOrganizationRequest } from './organizations/OrganizationService';
export { UserService } from './users/UserService';
export { RoleService } from './roles/RoleService';
export type { CreateRoleRequest } from './roles/RoleService';
export { PermissionService } from './permissions/PermissionService';
export { ApiKeyService } from './api-keys/ApiKeyService';
export type { CreateApiKeyRequest, ApiKeyCredential } from './api-keys/ApiKeyService';
export { SessionService } from './sessions/SessionService';
export type { CreateSessionRequest, SessionCredential } from './sessions/SessionService';
export { PolicyEngine } from './policies/PolicyEngine';
export type { CreatePolicyRequest } from './policies/PolicyEngine';
export { AuditService } from './audit/AuditService';
export type { CreateAuditEntryRequest } from './audit/AuditService';
export { AuthorizationService } from './authorization/AuthorizationService';
export type { AuthContext } from './authorization/AuthorizationService';
export { AuthenticationService } from './auth/AuthenticationService';
export type { LoginRequest, LoginResult, AuthenticatedPrincipal } from './auth/AuthenticationService';

export { PasswordHasher, TokenGenerator, maskApiKey, sanitizeLogValue } from './adapters/SecurityAdapters';
export type { IPasswordHasher, ITokenGenerator } from './adapters/SecurityAdapters';

export {
  IdentityError,
  AuthenticationError,
  AuthorizationError,
  OrganizationNotFoundError,
  UserNotFoundError,
  RoleNotFoundError,
  ApiKeyNotFoundError,
  SessionNotFoundError,
  PolicyNotFoundError,
  PermissionNotFoundError,
  ServiceAccountNotFoundError,
  PrivilegeEscalationError,
  UserAlreadyExistsError,
  UserLockedError,
  ApiKeyRevokedError,
  SessionExpiredError,
  CrossTenantError,
} from './adapters/IdentityErrors';

export {
  InMemoryIdentityRepository,
} from './repositories/InMemoryRepository';
export type {
  IdentityRepository,
  IOrganizationRepository,
  IUserRepository,
  IRoleRepository,
  IPermissionRepository,
  IApiKeyRepository,
  ISessionRepository,
  IServiceAccountRepository,
  IPolicyRepository,
  IAuditRepository,
} from './repositories/RepositoryInterfaces';

export type { Organization, OrganizationSettings, OrganizationStatus, OrganizationPlan } from './organizations/OrganizationModels';
export { DEFAULT_ORG_SETTINGS, PLAN_LIMITS } from './organizations/OrganizationModels';
export type { User, UserStatus, UserPreferences, CreateUserRequest, UpdateUserRequest } from './users/UserModels';
export { DEFAULT_USER_PREFERENCES, MAX_FAILED_LOGINS, isUserActive, isUserLocked } from './users/UserModels';
export type { Role, RoleType, SystemRoleName } from './roles/RoleModels';
export { SYSTEM_ROLES, isSystemRole, isPlatformAdminRole, isOrgAdminRole, isPrivilegedRole } from './roles/RoleModels';
export type { Permission, PermissionAction } from './permissions/PermissionModels';
export { SYSTEM_PERMISSIONS, PermissionSet, formatPermission, parsePermission, isValidPermission } from './permissions/PermissionModels';
export type { ApiKey, ApiKeyStatus, ApiKeyScope } from './api-keys/ApiKeyModels';
export { validateScopes, hasScope, isApiKeyActive, API_KEY_PREFIX } from './api-keys/ApiKeyModels';
export type { Session, SessionStatus } from './sessions/SessionModels';
export { isSessionActive, isSessionExpiringSoon, SESSION_PREFIX, DEFAULT_SESSION_DURATION_MS } from './sessions/SessionModels';
export type { ServiceAccount, ServiceAccountStatus } from './service-accounts/ServiceAccountModels';
export { isServiceAccountActive, SERVICE_ACCOUNT_PREFIX } from './service-accounts/ServiceAccountModels';
export type { Policy, PolicyStatement, PolicyCondition, PolicyEffect, PolicyDecision, PolicyConditionOperator } from './policies/PolicyModels';
export { ALLOW_DECISION, DENY_DECISION } from './policies/PolicyModels';
export type { AuditEntry, AuditAction, AuditSeverity } from './audit/AuditModels';
export { sanitizeAuditDetail, SENSITIVE_AUDIT_FIELDS } from './audit/AuditModels';

export type { UUID, ISOString, Metadata, BaseEntity, OrganizationScopedEntity, PaginatedResult, PageQuery, Result } from './types/shared';
export { ok, err } from './types/shared';
