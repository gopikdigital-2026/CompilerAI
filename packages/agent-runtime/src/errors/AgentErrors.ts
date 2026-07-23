export class AgentRuntimeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AgentRuntimeError';
  }

  toSafeObject(): { code: string; message: string } {
    return { code: this.code, message: this.message };
  }
}

export class AgentNotFoundError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'AGENT_NOT_FOUND');
    this.name = 'AgentNotFoundError';
  }
}

export class TaskNotFoundError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'TASK_NOT_FOUND');
    this.name = 'TaskNotFoundError';
  }
}

export class ExecutionNotFoundError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'EXECUTION_NOT_FOUND');
    this.name = 'ExecutionNotFoundError';
  }
}

export class AgentPermissionError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'AGENT_PERMISSION_DENIED');
    this.name = 'AgentPermissionError';
  }
}

export class AgentCapabilityError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'CAPABILITY_MISMATCH');
    this.name = 'AgentCapabilityError';
  }
}

export class AgentTimeoutError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'AGENT_TIMEOUT');
    this.name = 'AgentTimeoutError';
  }
}

export class AgentIsolationError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'ISOLATION_VIOLATION');
    this.name = 'AgentIsolationError';
  }
}

export class CheckpointNotFoundError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'CHECKPOINT_NOT_FOUND');
    this.name = 'CheckpointNotFoundError';
  }
}

export class AgentUnhealthyError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'AGENT_UNHEALTHY');
    this.name = 'AgentUnhealthyError';
  }
}

export class SchedulerError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'SCHEDULER_ERROR');
    this.name = 'SchedulerError';
  }
}

export class CommunicationError extends AgentRuntimeError {
  constructor(message: string) {
    super(message, 'COMMUNICATION_ERROR');
    this.name = 'CommunicationError';
  }
}

export function sanitizeMessagePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = /^(api[_-]?key|token|secret|password|bearer|authorization|credential)$/i;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.test(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeMessagePayload(value as Record<string, unknown>);
    } else if (typeof value === 'string') {
      const SECRET_PATTERNS = [/sk-[a-zA-Z0-9]{16,}/g, /Bearer\s+[a-zA-Z0-9._-]+/g];
      let sanitized = value;
      for (const pattern of SECRET_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
      result[key] = sanitized;
    } else {
      result[key] = value;
    }
  }
  return result;
}
