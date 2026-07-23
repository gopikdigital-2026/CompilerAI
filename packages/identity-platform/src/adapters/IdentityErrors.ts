export class IdentityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}

export class AuthenticationError extends IdentityError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_FAILED');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends IdentityError {
  constructor(message: string) {
    super(message, 'AUTHORIZATION_DENIED');
    this.name = 'AuthorizationError';
  }
}

export class OrganizationNotFoundError extends IdentityError {
  constructor(message: string) {
    super(message, 'ORGANIZATION_NOT_FOUND');
    this.name = 'OrganizationNotFoundError';
  }
}

export class UserNotFoundError extends IdentityError {
  constructor(message: string) {
    super(message, 'USER_NOT_FOUND');
    this.name = 'UserNotFoundError';
  }
}

export class RoleNotFoundError extends IdentityError {
  constructor(message: string) {
    super(message, 'ROLE_NOT_FOUND');
    this.name = 'RoleNotFoundError';
  }
}

export class ApiKeyNotFoundError extends IdentityError {
  constructor(message: string) {
    super(message, 'API_KEY_NOT_FOUND');
    this.name = 'ApiKeyNotFoundError';
  }
}

export class SessionNotFoundError extends IdentityError {
  constructor(message: string) {
    super(message, 'SESSION_NOT_FOUND');
    this.name = 'SessionNotFoundError';
  }
}

export class PolicyNotFoundError extends IdentityError {
  constructor(message: string) {
    super(message, 'POLICY_NOT_FOUND');
    this.name = 'PolicyNotFoundError';
  }
}

export class PermissionNotFoundError extends IdentityError {
  constructor(message: string) {
    super(message, 'PERMISSION_NOT_FOUND');
    this.name = 'PermissionNotFoundError';
  }
}

export class ServiceAccountNotFoundError extends IdentityError {
  constructor(message: string) {
    super(message, 'SERVICE_ACCOUNT_NOT_FOUND');
    this.name = 'ServiceAccountNotFoundError';
  }
}

export class PrivilegeEscalationError extends IdentityError {
  constructor(message: string) {
    super(message, 'PRIVILEGE_ESCALATION');
    this.name = 'PrivilegeEscalationError';
  }
}

export class UserAlreadyExistsError extends IdentityError {
  constructor(message: string) {
    super(message, 'USER_ALREADY_EXISTS');
    this.name = 'UserAlreadyExistsError';
  }
}

export class UserLockedError extends IdentityError {
  constructor(message: string) {
    super(message, 'USER_LOCKED');
    this.name = 'UserLockedError';
  }
}

export class ApiKeyRevokedError extends IdentityError {
  constructor(message: string) {
    super(message, 'API_KEY_REVOKED');
    this.name = 'ApiKeyRevokedError';
  }
}

export class SessionExpiredError extends IdentityError {
  constructor(message: string) {
    super(message, 'SESSION_EXPIRED');
    this.name = 'SessionExpiredError';
  }
}

export class CrossTenantError extends IdentityError {
  constructor(message: string) {
    super(message, 'CROSS_TENANT_VIOLATION');
    this.name = 'CrossTenantError';
  }
}
