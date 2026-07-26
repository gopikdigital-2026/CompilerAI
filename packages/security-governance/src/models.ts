// ---------------------------------------------------------------------------
// Core domain models for Security, Identity & Governance
// ---------------------------------------------------------------------------

// ── Identity ──────────────────────────────────────────────────────────────────

export type IdentityType = 'user' | 'organization' | 'ai_agent' | 'connector' | 'skill';
export type IdentityStatus = 'active' | 'suspended' | 'deactivated';

export interface Identity {
  id: string;
  type: IdentityType;
  organizationId: string;
  status: IdentityStatus;
  ownerId?: string;
  name: string;
  email?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

// ── Authentication ────────────────────────────────────────────────────────────

export type AuthMethod = 'oauth2' | 'oidc' | 'saml' | 'api_key' | 'service_account' | 'mock';

export interface AuthCredential {
  identityId: string;
  method: AuthMethod;
  token: string;
  expiresAt?: string;
  metadata: Record<string, unknown>;
}

export interface AuthResult {
  authenticated: boolean;
  identityId?: string;
  method: AuthMethod;
  token?: string;
  expiresAt?: string;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface IAuthProvider {
  method: AuthMethod;
  authenticate(credentials: AuthCredential): Promise<AuthResult>;
  validateToken(token: string): Promise<AuthResult>;
  refreshToken(token: string): Promise<AuthResult>;
}

// ── Authorization ─────────────────────────────────────────────────────────────

export type RoleName = 'owner' | 'admin' | 'manager' | 'employee' | 'auditor' | 'viewer' | 'ai_agent';

export type PermissionAction = 'read' | 'write' | 'execute' | 'delete' | 'admin';

export type ResourceCategory =
  | 'knowledge_graph'
  | 'enterprise_rag'
  | 'skills_marketplace'
  | 'multi_agent'
  | 'connectors'
  | 'workflows'
  | 'settings'
  | 'audit'
  | 'secrets';

export interface Role {
  name: RoleName;
  description: string;
  permissions: RolePermission[];
  priority: number;
}

export interface RolePermission {
  resource: ResourceCategory;
  actions: PermissionAction[];
}

export interface ABACContext {
  organizationId: string;
  department?: string;
  tags?: string[];
  timeOfDay?: string;
  dayOfWeek?: string;
  resourceClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  resourceTags?: string[];
  resourceOwner?: string;
  customAttributes?: Record<string, unknown>;
}

export interface AuthorizationRequest {
  identityId: string;
  resource: ResourceCategory;
  action: PermissionAction;
  organizationId: string;
  roles: RoleName[];
  abacContext?: ABACContext;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason: string;
  matchedBy: 'rbac' | 'abac' | 'policy' | 'denied';
  conditions?: string[];
  evaluatedAt: string;
}

// ── Policy Engine ─────────────────────────────────────────────────────────────

export type PolicyEffect = 'allow' | 'deny' | 'require_approval' | 'restricted' | 'read_only';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  effect: PolicyEffect;
  priority: number;
  condition: PolicyCondition;
  resources: ResourceCategory[];
  actions: PermissionAction[];
  roles: RoleName[];
}

export interface PolicyCondition {
  organizationId?: string;
  department?: string;
  tags?: string[];
  timeWindow?: { start: string; end: string };
  daysOfWeek?: string[];
  classification?: string[];
  custom?: Record<string, unknown>;
}

export interface PolicyEvaluationRequest {
  identityId: string;
  resource: ResourceCategory;
  action: PermissionAction;
  organizationId: string;
  roles: RoleName[];
  abacContext?: ABACContext;
}

export interface PolicyEvaluationResult {
  decision: PolicyEffect;
  matchedRules: PolicyRule[];
  reason: string;
  trace: PolicyTraceEntry[];
  evaluatedAt: string;
}

export interface PolicyTraceEntry {
  ruleId: string;
  ruleName: string;
  effect: PolicyEffect;
  matched: boolean;
  reason: string;
}

// ── Secrets ───────────────────────────────────────────────────────────────────

export type SecretType = 'api_key' | 'oauth_token' | 'certificate' | 'internal';

export interface SecretRecord {
  id: string;
  name: string;
  type: SecretType;
  organizationId: string;
  encryptedValue: string;
  createdAt: string;
  updatedAt: string;
  rotationPeriodDays?: number;
  lastRotatedAt?: string;
  metadata: Record<string, unknown>;
}

export interface ISecretStore {
  store(secret: SecretRecord): void;
  retrieve(id: string): SecretRecord | undefined;
  retrieveByName(name: string, organizationId: string): SecretRecord | undefined;
  delete(id: string): boolean;
  list(organizationId: string): SecretRecord[];
  update(id: string, updates: Partial<SecretRecord>): SecretRecord | undefined;
}

// ── Encryption ────────────────────────────────────────────────────────────────

export interface IEncryptionService {
  encrypt(plaintext: string, keyId?: string): EncryptedData;
  decrypt(data: EncryptedData, keyId?: string): string;
  hash(data: string, algorithm?: string): string;
  sign(data: string, keyId?: string): Signature;
  verify(data: string, signature: Signature, keyId?: string): boolean;
  rotateKey(keyId: string): string;
  getKeyIds(): string[];
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  algorithm: string;
  keyId: string;
}

export interface Signature {
  data: string;
  keyId: string;
  algorithm: string;
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'login'
  | 'logout'
  | 'skill_install'
  | 'agent_execute'
  | 'kg_access'
  | 'rag_query'
  | 'permission_change'
  | 'policy_change'
  | 'auth_denied'
  | 'secret_access'
  | 'data_export'
  | 'config_change';

export type AuditResult = 'success' | 'failure' | 'denied';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorType: IdentityType;
  resource: string;
  action: AuditAction;
  result: AuditResult;
  organizationId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  traceId?: string;
}

export interface IAuditLog {
  write(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent;
  query(filter: AuditQuery): AuditEvent[];
  getById(id: string): AuditEvent | undefined;
  count(filter?: AuditQuery): number;
  export(filter: AuditQuery): AuditEvent[];
}

export interface AuditQuery {
  organizationId?: string;
  actor?: string;
  action?: AuditAction;
  result?: AuditResult;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

// ── Compliance ────────────────────────────────────────────────────────────────

export type ComplianceFramework = 'iso27001' | 'soc2' | 'gdpr' | 'nis2';

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  controlCode: string;
  title: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
  assessedAt?: string;
  evidence?: string[];
}

export interface ComplianceAssessment {
  framework: ComplianceFramework;
  controls: ComplianceControl[];
  overallStatus: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed';
  assessedAt: string;
  score: number;
}

export interface IComplianceManager {
  registerControl(control: ComplianceControl): void;
  getControls(framework: ComplianceFramework): ComplianceControl[];
  assessFramework(framework: ComplianceFramework): ComplianceAssessment;
  getAllFrameworks(): ComplianceFramework[];
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

export type TelemetryEventType =
  | 'authentication.success'
  | 'authentication.failed'
  | 'authorization.denied'
  | 'authorization.granted'
  | 'policy.evaluated'
  | 'secret.accessed'
  | 'encryption.completed'
  | 'audit.written';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ITelemetryEngine {
  emit(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  getEventsByType(type: TelemetryEventType): TelemetryEvent[];
  clear(): void;
}

// ── Public API interfaces ─────────────────────────────────────────────────────

export interface ISecurityGovernance {
  authenticate(credential: AuthCredential): Promise<AuthResult>;
  authorize(request: AuthorizationRequest): AuthorizationDecision;
  evaluatePolicy(request: PolicyEvaluationRequest): PolicyEvaluationResult;
  encrypt(plaintext: string, keyId?: string): EncryptedData;
  decrypt(data: EncryptedData, keyId?: string): string;
  storeSecret(name: string, value: string, type: SecretType, organizationId: string): SecretRecord;
  getSecret(id: string): string | undefined;
  writeAuditLog(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent;
}
