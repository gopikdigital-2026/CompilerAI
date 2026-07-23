export class MarketplaceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'MarketplaceError';
  }

  toSafeObject(): { code: string; message: string } {
    return { code: this.code, message: this.message };
  }
}

export class ManifestValidationError extends MarketplaceError {
  constructor(
    message: string,
    public readonly errors: string[],
  ) {
    super(message, 'MANIFEST_VALIDATION_ERROR');
    this.name = 'ManifestValidationError';
  }
}

export class SignatureVerificationError extends MarketplaceError {
  constructor(message: string) {
    super(message, 'SIGNATURE_VERIFICATION_FAILED');
    this.name = 'SignatureVerificationError';
  }
}

export class ChecksumMismatchError extends MarketplaceError {
  constructor(message: string) {
    super(message, 'CHECKSUM_MISMATCH');
    this.name = 'ChecksumMismatchError';
  }
}

export class ToolNotFoundError extends MarketplaceError {
  constructor(message: string) {
    super(message, 'TOOL_NOT_FOUND');
    this.name = 'ToolNotFoundError';
  }
}

export class ToolAlreadyInstalledError extends MarketplaceError {
  constructor(message: string) {
    super(message, 'TOOL_ALREADY_INSTALLED');
    this.name = 'ToolAlreadyInstalledError';
  }
}

export class ToolNotInstalledError extends MarketplaceError {
  constructor(message: string) {
    super(message, 'TOOL_NOT_INSTALLED');
    this.name = 'ToolNotInstalledError';
  }
}

export class PermissionDeniedError extends MarketplaceError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED');
    this.name = 'PermissionDeniedError';
  }
}

export class IncompatibleToolError extends MarketplaceError {
  constructor(message: string) {
    super(message, 'INCOMPATIBLE_TOOL');
    this.name = 'IncompatibleToolError';
  }
}

export class DependencyResolutionError extends MarketplaceError {
  constructor(message: string) {
    super(message, 'DEPENDENCY_RESOLUTION_FAILED');
    this.name = 'DependencyResolutionError';
  }
}

export class VersionConflictError extends MarketplaceError {
  constructor(message: string) {
    super(message, 'VERSION_CONFLICT');
    this.name = 'VersionConflictError';
  }
}
