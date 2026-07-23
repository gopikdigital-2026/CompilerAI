import type { ConnectorOperation, ConnectorExecutionContext } from '../../runtime/ConnectorExecutionResult';
import { ConnectorRuntimeError } from '../../errors/ConnectorRuntimeError';
import type { ConnectorId } from '../../types/index';

export type TestConnectorId = 'test-connector';

export const TEST_CONNECTOR_ID: ConnectorId = 'test-connector';

const echoOperation: ConnectorOperation = {
  name: 'echo',
  timeoutMs: 5_000,
  retryable: false,
  idempotent: true,
  requiredCapabilities: ['test:echo'],
  validateInput(input: Record<string, unknown>): string[] {
    const errors: string[] = [];
    if (typeof input['message'] !== 'string' || (input['message'] as string).length === 0) {
      errors.push('message is required and must be a non-empty string');
    }
    if (input['delayMs'] !== undefined && (typeof input['delayMs'] !== 'number' || (input['delayMs'] as number) < 0)) {
      errors.push('delayMs must be a non-negative number');
    }
    return errors;
  },
  async execute(input: Record<string, unknown>, context: ConnectorExecutionContext, signal: AbortSignal): Promise<unknown> {
    const delayMs = input['delayMs'] as number | undefined;
    if (delayMs && delayMs > 0) {
      await sleep(delayMs, signal);
    }
    return {
      echoed: input['message'] as string,
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
    };
  },
};

const failOperation: ConnectorOperation = {
  name: 'fail',
  timeoutMs: 5_000,
  retryable: true,
  idempotent: false,
  requiredCapabilities: ['test:fail'],
  validateInput(input: Record<string, unknown>): string[] {
    const errors: string[] = [];
    if (input['errorCode'] !== undefined && typeof input['errorCode'] !== 'string') {
      errors.push('errorCode must be a string');
    }
    return errors;
  },
  async execute(input: Record<string, unknown>, _context: ConnectorExecutionContext, _signal: AbortSignal): Promise<unknown> {
    const code = (input['errorCode'] as string) ?? 'PROVIDER_ERROR';
    const message = (input['message'] as string) ?? 'Operation failed as requested';
    throw new ConnectorRuntimeError(
      message, code as ConnectorRuntimeError['errorCode'], true,
      TEST_CONNECTOR_ID, 'fail', 'test-exec',
    );
  },
};

const timeoutOperation: ConnectorOperation = {
  name: 'timeout',
  timeoutMs: 100,
  retryable: false,
  idempotent: false,
  requiredCapabilities: ['test:timeout'],
  validateInput(input: Record<string, unknown>): string[] {
    const errors: string[] = [];
    if (typeof input['delayMs'] !== 'number' || (input['delayMs'] as number) <= 0) {
      errors.push('delayMs is required and must be a positive number');
    }
    return errors;
  },
  async execute(input: Record<string, unknown>, _context: ConnectorExecutionContext, signal: AbortSignal): Promise<unknown> {
    await sleep(input['delayMs'] as number, signal);
    throw new ConnectorRuntimeError(
      'Operation should have timed out', 'TIMEOUT_ERROR', false,
      TEST_CONNECTOR_ID, 'timeout', 'test-exec',
    );
  },
};

const rateLimitedOperation: ConnectorOperation = {
  name: 'rateLimited',
  timeoutMs: 5_000,
  retryable: true,
  idempotent: false,
  requiredCapabilities: ['test:rateLimited'],
  validateInput(): string[] {
    return [];
  },
  async execute(_input: Record<string, unknown>, _context: ConnectorExecutionContext, _signal: AbortSignal): Promise<unknown> {
    throw new ConnectorRuntimeError(
      'Rate limit exceeded', 'RATE_LIMIT_ERROR', true,
      TEST_CONNECTOR_ID, 'rateLimited', 'test-exec',
      undefined, { limit: 100, remaining: 0 },
    );
  },
};

const requiresAuthOperation: ConnectorOperation = {
  name: 'requiresAuth',
  timeoutMs: 5_000,
  retryable: false,
  idempotent: true,
  requiredCapabilities: ['test:requiresAuth'],
  validateInput(): string[] {
    return [];
  },
  async execute(_input: Record<string, unknown>, _context: ConnectorExecutionContext, _signal: AbortSignal): Promise<unknown> {
    throw new ConnectorRuntimeError(
      'Authentication required', 'AUTHENTICATION_ERROR', false,
      TEST_CONNECTOR_ID, 'requiresAuth', 'test-exec',
    );
  },
};

const refreshTokenOperation: ConnectorOperation = {
  name: 'refreshToken',
  timeoutMs: 10_000,
  retryable: true,
  idempotent: false,
  requiredCapabilities: ['test:refreshToken'],
  validateInput(input: Record<string, unknown>): string[] {
    const errors: string[] = [];
    if (typeof input['currentRefreshToken'] !== 'string' || (input['currentRefreshToken'] as string).length === 0) {
      errors.push('currentRefreshToken is required');
    }
    return errors;
  },
  async execute(_input: Record<string, unknown>, _context: ConnectorExecutionContext, _signal: AbortSignal): Promise<unknown> {
    return {
      refreshed: true,
      newTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
  },
};

const unstableState = new Map<string, number>();

const unstableOperation: ConnectorOperation = {
  name: 'unstableOperation',
  timeoutMs: 5_000,
  retryable: true,
  idempotent: true,
  requiredCapabilities: ['test:unstable'],
  validateInput(input: Record<string, unknown>): string[] {
    const errors: string[] = [];
    if (typeof input['failFirstN'] !== 'number' || (input['failFirstN'] as number) < 0) {
      errors.push('failFirstN must be a non-negative number');
    }
    return errors;
  },
  async execute(input: Record<string, unknown>, context: ConnectorExecutionContext, _signal: AbortSignal): Promise<unknown> {
    const key = context.requestId;
    const attempt = unstableState.get(key) ?? 0;
    unstableState.set(key, attempt + 1);
    const failFirstN = input['failFirstN'] as number;

    if (attempt < failFirstN) {
      throw new ConnectorRuntimeError(
        `Unstable operation failed on attempt ${attempt + 1}`, 'PROVIDER_ERROR', true,
        TEST_CONNECTOR_ID, 'unstableOperation', 'test-exec',
      );
    }

    unstableState.delete(key);
    return { attempt: attempt + 1, succeeded: true };
  },
};

export function resetUnstableState(): void {
  unstableState.clear();
}

export const TEST_OPERATIONS: ConnectorOperation[] = [
  echoOperation,
  failOperation,
  timeoutOperation,
  rateLimitedOperation,
  requiresAuthOperation,
  refreshTokenOperation,
  unstableOperation,
];

export function getTestOperation(name: string): ConnectorOperation | null {
  return TEST_OPERATIONS.find((op) => op.name === name) ?? null;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}
