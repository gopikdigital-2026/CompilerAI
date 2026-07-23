import type { ConnectorExecutionContext } from './ConnectorExecutionResult';
import { generateRequestId, generateCorrelationId } from '../utils/index';
import type { UUID, Metadata } from '../types/index';

export function createExecutionContext(params: {
  organizationId: UUID;
  userId?: UUID | null;
  traceId?: string;
  metadata?: Metadata;
}): ConnectorExecutionContext {
  return {
    organizationId: params.organizationId,
    userId: params.userId ?? null,
    requestId: generateRequestId(),
    correlationId: generateCorrelationId(),
    traceId: params.traceId ?? `trace_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    metadata: params.metadata ?? {},
  };
}
