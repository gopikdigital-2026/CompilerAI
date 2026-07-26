import type {
  AuthCredential,
  AuthResult,
  AuditEvent,
  AuthorizationDecision,
  AuthorizationRequest,
  ABACContext,
  ComplianceAssessment,
  ComplianceControl,
  ComplianceFramework,
  EncryptedData,
  ITelemetryEngine,
  Identity,
  IdentityType,
  IdentityStatus,
  ISecurityGovernance,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyRule,
  SecretRecord,
  SecretType,
} from '../models.js';
import { IdentityManager } from '../identity/IdentityManager.js';
import { AuthenticationManager } from '../authentication/AuthenticationManager.js';
import { AuthorizationEngine } from '../authorization/AuthorizationEngine.js';
import { PolicyEngine, createPolicyRule } from '../policies/PolicyEngine.js';
import { InMemorySecretStore, SecretsManager } from '../secrets/SecretsManager.js';
import { EncryptionService } from '../encryption/EncryptionService.js';
import { AuditLog } from '../audit/AuditLog.js';
import { ComplianceManager } from '../compliance/ComplianceManager.js';
import { TelemetryEngine } from '../telemetry/TelemetryEngine.js';

export class SecurityGovernance implements ISecurityGovernance {
  public readonly identity: IdentityManager;
  public readonly auth: AuthenticationManager;
  public readonly authz: AuthorizationEngine;
  public readonly policies: PolicyEngine;
  public readonly secrets: SecretsManager;
  public readonly encryption: EncryptionService;
  public readonly audit: AuditLog;
  public readonly compliance: ComplianceManager;
  public readonly telemetry: ITelemetryEngine;

  constructor() {
    this.identity = new IdentityManager();
    this.auth = new AuthenticationManager(this.identity);
    this.policies = new PolicyEngine();
    this.authz = new AuthorizationEngine(this.policies);
    this.encryption = new EncryptionService();
    const secretStore = new InMemorySecretStore();
    const encKey = () => this.encryption.getKeyIds()[0] ?? 'default';
    this.secrets = new SecretsManager(
      secretStore,
      (pt) => {
        const data = this.encryption.encrypt(pt, encKey());
        return `${data.iv}:${data.ciphertext}`;
      },
      (ct) => {
        const [iv, ciphertext] = ct.split(':');
        return this.encryption.decrypt({ ciphertext, iv, algorithm: 'aes-256-cbc', keyId: encKey() });
      },
    );
    this.audit = new AuditLog();
    this.compliance = new ComplianceManager();
    this.telemetry = new TelemetryEngine();
  }

  // ── Identity ────────────────────────────────────────────────────────────────

  createIdentity(
    type: IdentityType,
    name: string,
    organizationId: string,
    options?: { email?: string; ownerId?: string; status?: IdentityStatus; metadata?: Record<string, unknown> },
  ): Identity {
    return this.identity.create(type, name, organizationId, options);
  }

  getIdentity(id: string): Identity | undefined {
    return this.identity.get(id);
  }

  setIdentities(id: string, status: IdentityStatus): Identity | undefined {
    return this.identity.setStatus(id, status);
  }

  // ── Authentication ──────────────────────────────────────────────────────────

  async authenticate(credential: AuthCredential): Promise<AuthResult> {
    const result = await this.auth.authenticate(credential);

    this.telemetry.emit({
      type: result.authenticated ? 'authentication.success' : 'authentication.failed',
      timestamp: new Date().toISOString(),
      metadata: { identityId: credential.identityId, method: credential.method },
    });

    this.audit.write({
      actor: credential.identityId,
      actorType: 'user',
      resource: 'auth',
      action: 'login',
      result: result.authenticated ? 'success' : 'failure',
      organizationId: this.identity.get(credential.identityId)?.organizationId ?? 'unknown',
      details: { method: credential.method, error: result.error },
    });

    return result;
  }

  async validateToken(token: string, method?: AuthCredential['method']): Promise<AuthResult> {
    return this.auth.validateToken(token, method);
  }

  // ── Authorization ───────────────────────────────────────────────────────────

  authorize(request: AuthorizationRequest): AuthorizationDecision {
    const decision = this.authz.authorize(request);

    this.telemetry.emit({
      type: decision.allowed ? 'authorization.granted' : 'authorization.denied',
      timestamp: new Date().toISOString(),
      metadata: {
        identityId: request.identityId,
        resource: request.resource,
        action: request.action,
        reason: decision.reason,
      },
    });

    if (!decision.allowed) {
      this.audit.write({
        actor: request.identityId,
        actorType: 'user',
        resource: request.resource,
        action: 'auth_denied',
        result: 'denied',
        organizationId: request.organizationId,
        details: { reason: decision.reason, matchedBy: decision.matchedBy },
      });
    }

    return decision;
  }

  // ── Policy ──────────────────────────────────────────────────────────────────

  evaluatePolicy(request: PolicyEvaluationRequest): PolicyEvaluationResult {
    const result = this.policies.evaluate(request);

    this.telemetry.emit({
      type: 'policy.evaluated',
      timestamp: new Date().toISOString(),
      metadata: {
        identityId: request.identityId,
        decision: result.decision,
        matchedRules: result.matchedRules.length,
      },
    });

    return result;
  }

  addPolicyRule(rule: PolicyRule): void {
    this.policies.addRule(rule);
  }

  removePolicyRule(ruleId: string): boolean {
    return this.policies.removeRule(ruleId);
  }

  // ── Encryption ──────────────────────────────────────────────────────────────

  encrypt(plaintext: string, keyId?: string): EncryptedData {
    const result = this.encryption.encrypt(plaintext, keyId);

    this.telemetry.emit({
      type: 'encryption.completed',
      timestamp: new Date().toISOString(),
      metadata: { keyId: result.keyId, algorithm: result.algorithm },
    });

    return result;
  }

  decrypt(data: EncryptedData, keyId?: string): string {
    return this.encryption.decrypt(data, keyId);
  }

  hash(data: string, algorithm?: string): string {
    return this.encryption.hash(data, algorithm);
  }

  sign(data: string, keyId?: string): ReturnType<EncryptionService['sign']> {
    return this.encryption.sign(data, keyId);
  }

  verify(data: string, signature: ReturnType<EncryptionService['sign']>, keyId?: string): boolean {
    return this.encryption.verify(data, signature, keyId);
  }

  rotateKey(keyId: string): string {
    return this.encryption.rotateKey(keyId);
  }

  // ── Secrets ─────────────────────────────────────────────────────────────────

  storeSecret(name: string, value: string, type: SecretType, organizationId: string): SecretRecord {
    const secret = this.secrets.storeSecret(name, value, type, organizationId);

    this.audit.write({
      actor: 'system',
      actorType: 'user',
      resource: 'secrets',
      action: 'secret_access',
      result: 'success',
      organizationId,
      details: { secretId: secret.id, secretName: name, type, operation: 'store' },
    });

    return secret;
  }

  getSecret(id: string): string | undefined {
    const secret = this.secrets.getSecretRecord(id);
    const value = this.secrets.getSecret(id);

    if (value !== undefined) {
      this.telemetry.emit({
        type: 'secret.accessed',
        timestamp: new Date().toISOString(),
        metadata: { secretId: id, secretName: secret?.name },
      });

      this.audit.write({
        actor: 'system',
        actorType: 'user',
        resource: 'secrets',
        action: 'secret_access',
        result: 'success',
        organizationId: secret?.organizationId ?? 'unknown',
        details: { secretId: id, secretName: secret?.name, operation: 'retrieve' },
      });
    }

    return value;
  }

  rotateSecret(id: string, newValue: string): SecretRecord | undefined {
    return this.secrets.rotateSecret(id, newValue);
  }

  listSecrets(organizationId: string): SecretRecord[] {
    return this.secrets.listSecrets(organizationId);
  }

  deleteSecret(id: string): boolean {
    return this.secrets.deleteSecret(id);
  }

  // ── Audit ───────────────────────────────────────────────────────────────────

  writeAuditLog(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const written = this.audit.write(event);

    this.telemetry.emit({
      type: 'audit.written',
      timestamp: new Date().toISOString(),
      metadata: { auditId: written.id, action: written.action, actor: written.actor },
    });

    return written;
  }

  queryAuditLog(filter: Parameters<AuditLog['query']>[0]): AuditEvent[] {
    return this.audit.query(filter);
  }

  // ── Compliance ──────────────────────────────────────────────────────────────

  getComplianceControls(framework: ComplianceFramework): ComplianceControl[] {
    return this.compliance.getControls(framework);
  }

  assessCompliance(framework: ComplianceFramework): ComplianceAssessment {
    return this.compliance.assessFramework(framework);
  }

  setComplianceControlStatus(controlId: string, status: ComplianceControl['status'], evidence?: string[]): void {
    this.compliance.setControlStatus(controlId, status, evidence);
  }

  getAllFrameworks(): ComplianceFramework[] {
    return this.compliance.getAllFrameworks();
  }

  // ── Telemetry ───────────────────────────────────────────────────────────────

  getTelemetryEvents() {
    return this.telemetry.getEvents();
  }

  getTelemetryEventsByType(type: Parameters<ITelemetryEngine['getEventsByType']>[0]) {
    return this.telemetry.getEventsByType(type);
  }

  // ── Convenience ─────────────────────────────────────────────────────────────

  createABACContext(organizationId: string, attrs?: Partial<ABACContext>): ABACContext {
    return {
      organizationId,
      ...attrs,
    };
  }

  createPolicyRule = createPolicyRule;
}
