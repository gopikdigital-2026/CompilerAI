// Core API facade
export { SecurityGovernance } from './api/SecurityGovernance.js';

// Concrete implementations
export { IdentityManager, generateIdentityId } from './identity/IdentityManager.js';
export { AuthenticationManager, MockAuthProvider } from './authentication/AuthenticationManager.js';
export { AuthorizationEngine } from './authorization/AuthorizationEngine.js';
export { PolicyEngine, createPolicyRule } from './policies/PolicyEngine.js';
export { InMemorySecretStore, SecretsManager } from './secrets/SecretsManager.js';
export { EncryptionService } from './encryption/EncryptionService.js';
export { AuditLog } from './audit/AuditLog.js';
export { ComplianceManager } from './compliance/ComplianceManager.js';
export { TelemetryEngine } from './telemetry/TelemetryEngine.js';
export { getRoleDefinition, getAllRoles, getRolePermissions, hasRolePermission } from './roles/RoleDefinitions.js';

// All domain models & types
export type {
  Identity, IdentityType, IdentityStatus,
  AuthCredential, AuthMethod, AuthResult, IAuthProvider,
  Role, RoleName, RolePermission, PermissionAction, ResourceCategory,
  ABACContext, AuthorizationRequest, AuthorizationDecision,
  PolicyEffect, PolicyRule, PolicyCondition, PolicyEvaluationRequest, PolicyEvaluationResult, PolicyTraceEntry,
  SecretType, SecretRecord, ISecretStore,
  EncryptedData, Signature, IEncryptionService,
  AuditAction, AuditResult, AuditEvent, AuditQuery, IAuditLog,
  ComplianceFramework, ComplianceControl, ComplianceAssessment, IComplianceManager,
  TelemetryEventType, TelemetryEvent, ITelemetryEngine,
  ISecurityGovernance,
} from './models.js';
