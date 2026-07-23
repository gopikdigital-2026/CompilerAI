export class AutomationStudioError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AutomationStudioError';
  }
}

export class WorkflowNotFoundError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'WORKFLOW_NOT_FOUND');
    this.name = 'WorkflowNotFoundError';
  }
}

export class NodeNotFoundError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'NODE_NOT_FOUND');
    this.name = 'NodeNotFoundError';
  }
}

export class ConnectionNotFoundError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'CONNECTION_NOT_FOUND');
    this.name = 'ConnectionNotFoundError';
  }
}

export class WorkflowValidationError extends AutomationStudioError {
  constructor(message: string, public readonly errors: string[] = []) {
    super(message, 'WORKFLOW_VALIDATION_FAILED');
    this.name = 'WorkflowValidationError';
  }
}

export class NodeValidationError extends AutomationStudioError {
  constructor(message: string, public readonly errors: string[] = []) {
    super(message, 'NODE_VALIDATION_FAILED');
    this.name = 'NodeValidationError';
  }
}

export class PublicationNotFoundError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'PUBLICATION_NOT_FOUND');
    this.name = 'PublicationNotFoundError';
  }
}

export class WorkflowAlreadyPublishedError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'WORKFLOW_ALREADY_PUBLISHED');
    this.name = 'WorkflowAlreadyPublishedError';
  }
}

export class WorkflowNotPublishedError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'WORKFLOW_NOT_PUBLISHED');
    this.name = 'WorkflowNotPublishedError';
  }
}

export class SimulationNotFoundError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'SIMULATION_NOT_FOUND');
    this.name = 'SimulationNotFoundError';
  }
}

export class SimulationError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'SIMULATION_ERROR');
    this.name = 'SimulationError';
  }
}

export class TemplateNotFoundError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'TEMPLATE_NOT_FOUND');
    this.name = 'TemplateNotFoundError';
  }
}

export class ImportExportError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'IMPORT_EXPORT_ERROR');
    this.name = 'ImportExportError';
  }
}

export class MonitorNotFoundError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'MONITOR_NOT_FOUND');
    this.name = 'MonitorNotFoundError';
  }
}

export class ReviewNotFoundError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'REVIEW_NOT_FOUND');
    this.name = 'ReviewNotFoundError';
  }
}

export class CommentNotFoundError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'COMMENT_NOT_FOUND');
    this.name = 'CommentNotFoundError';
  }
}

export class ComponentNotFoundError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'COMPONENT_NOT_FOUND');
    this.name = 'ComponentNotFoundError';
  }
}

export class RollbackError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'ROLLBACK_FAILED');
    this.name = 'RollbackError';
  }
}

export class CrossTenantError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'CROSS_TENANT_VIOLATION');
    this.name = 'CrossTenantError';
  }
}

export class AuthorizationError extends AutomationStudioError {
  constructor(message: string) {
    super(message, 'AUTHORIZATION_DENIED');
    this.name = 'AuthorizationError';
  }
}
