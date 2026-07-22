// ─── Tool errors ────────────────────────────────────────────────────────────────

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolError';
  }
}

export class ToolNotFoundError extends ToolError {
  constructor(toolId: string) {
    super(`Tool not found: ${toolId}`);
    this.name = 'ToolNotFoundError';
  }
}

export class ToolPermissionDeniedError extends ToolError {
  constructor(message: string) {
    super(message);
    this.name = 'ToolPermissionDeniedError';
  }
}

export class ToolIncompatibleError extends ToolError {
  constructor(toolA: string, toolB: string) {
    super(`Tools are incompatible: ${toolA} and ${toolB}`);
    this.name = 'ToolIncompatibleError';
  }
}

export class ToolRegistryError extends ToolError {
  constructor(message: string) {
    super(message);
    this.name = 'ToolRegistryError';
  }
}

export class NoEligibleToolsError extends ToolError {
  constructor(message = 'No eligible tools found for the given context.') {
    super(message);
    this.name = 'NoEligibleToolsError';
  }
}
