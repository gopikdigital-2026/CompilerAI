// ─── Domain ↔ Database row mappers ──────────────────────────────────────────────
// Convert between domain models (from compiler/runtime) and database row types.

import type { RuntimeExecution } from '../../../compiler/runtime/models/RuntimeExecution';
import type { WorkflowDefinition } from '../../../compiler/runtime/models/WorkflowModels';
import type { ApprovalRequest, ApprovalDecision } from '../../../compiler/runtime/models/ApprovalModels';
import type { RuntimeCheckpoint } from '../../../compiler/runtime/models/CheckpointModels';
import type { RuntimeEvent } from '../../../compiler/runtime/models/RuntimeEvent';
import type { IdempotencyRecord } from '../../../platform/api/services/IdempotencyService';
import type {
  RuntimeExecutionRow, WorkflowRow, ApprovalRow, CheckpointRow,
  TelemetryEventRow, IdempotencyRecordRow, OutboxEventRow, AuditLogRow,
} from '../schemas/SchemaTypes';
import type { OutboxEvent } from '../../events/OutboxManager';
import type { AuditLogEntry } from '../../observability/AuditLog';

export class RuntimeExecutionMapper {
  static toRow(exec: RuntimeExecution, organizationId: string): Record<string, unknown> {
    return {
      id: exec.executionId,
      organization_id: organizationId,
      request_id: exec.requestId,
      user_id: null,
      status: exec.status,
      idempotency_key: exec.idempotencyKey,
      risk_tolerance: 'MEDIUM',
      min_confidence: 50,
      max_duration_ms: 60000,
      allow_rollback: true,
      require_approval: false,
      locale: 'en',
      intelligence_request: {},
      metadata: {},
      started_at: exec.startedAt,
      completed_at: exec.completedAt,
      paused_at: null,
      resumed_at: null,
      cancelled_at: null,
      error_message: exec.errorMessage,
      warnings: exec.warnings,
      version: 1,
    };
  }

  static fromRow(row: RuntimeExecutionRow): RuntimeExecution {
    return {
      executionId: row.id,
      requestId: row.request_id,
      organizationId: row.organization_id,
      idempotencyKey: row.idempotency_key ?? '',
      status: row.status as RuntimeExecution['status'],
      workflowExecution: null,
      checkpoints: [],
      nodeResults: {},
      rollbackTriggered: false,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message,
      warnings: row.warnings as string[],
      version: String(row.version),
    } as RuntimeExecution;
  }
}

export class WorkflowMapper {
  static toRow(def: WorkflowDefinition): Record<string, unknown> {
    return {
      id: def.workflowId,
      organization_id: def.organizationId,
      name: def.name,
      description: def.description,
      nodes: def.nodes,
      edges: def.edges,
      mode: def.mode,
      current_version: def.version,
      content_hash: def.contentHash,
      active: false,
      status: 'ACTIVE',
      metadata: {},
    };
  }

  static fromRow(row: WorkflowRow): WorkflowDefinition {
    return {
      workflowId: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      nodes: row.nodes as WorkflowDefinition['nodes'],
      edges: row.edges as WorkflowDefinition['edges'],
      mode: row.mode as WorkflowDefinition['mode'],
      version: row.current_version,
      contentHash: row.content_hash,
      createdAt: row.created_at,
    } as WorkflowDefinition;
  }
}

export class ApprovalMapper {
  static toRow(approval: ApprovalRequest): Record<string, unknown> {
    const decision = approval.decision as ApprovalDecision | null;
    return {
      id: approval.approvalId,
      organization_id: approval.organizationId,
      execution_id: approval.executionId,
      node_id: approval.nodeId,
      node_label: approval.nodeLabel,
      reason: approval.reason,
      description: approval.description,
      risk_level: approval.riskLevel,
      confidence_score: approval.confidenceScore,
      status: approval.status,
      decision_type: decision?.decision ?? null,
      reviewed_by: decision?.reviewedBy ?? null,
      comment: decision?.comment ?? null,
      decided_at: decision?.decidedAt ?? null,
      metadata: {},
    };
  }

  static fromRow(row: ApprovalRow): ApprovalRequest {
    const decision: ApprovalDecision | null = row.decision_type ? {
      decisionId: `dec-${row.id}`,
      approvalId: row.id,
      decision: row.decision_type as ApprovalDecision['decision'],
      reviewedBy: row.reviewed_by ?? 'unknown',
      comment: row.comment ?? '',
      decidedAt: row.decided_at ?? new Date().toISOString(),
      requestedChanges: [],
    } : null;

    return {
      approvalId: row.id,
      organizationId: row.organization_id,
      executionId: row.execution_id,
      nodeId: row.node_id,
      nodeLabel: row.node_label,
      reason: row.reason,
      description: row.description,
      riskLevel: row.risk_level as ApprovalRequest['riskLevel'],
      confidenceScore: row.confidence_score,
      status: row.status as ApprovalRequest['status'],
      decision,
      createdAt: row.created_at,
    } as ApprovalRequest;
  }
}

export class CheckpointMapper {
  static toRow(cp: RuntimeCheckpoint): Record<string, unknown> {
    return {
      id: cp.checkpointId,
      organization_id: cp.organizationId,
      execution_id: cp.executionId,
      node_id: cp.stage,
      content_hash: cp.contentHash,
      state_data: cp.state,
      token_id: null,
      token_expires_at: null,
      token_consumed: false,
    };
  }

  static fromRow(row: CheckpointRow): RuntimeCheckpoint {
    return {
      checkpointId: row.id,
      executionId: row.execution_id,
      organizationId: row.organization_id,
      stage: row.node_id,
      contentHash: row.content_hash,
      state: row.state_data as Record<string, unknown>,
      completedNodeIds: [],
      timestamp: row.created_at,
    } as RuntimeCheckpoint;
  }
}

export class TelemetryEventMapper {
  static toRow(event: RuntimeEvent, organizationId: string): Record<string, unknown> {
    return {
      id: event.eventId,
      organization_id: organizationId,
      event_id: event.eventId,
      event_type: event.eventType,
      execution_id: event.executionId,
      node_id: event.nodeId ?? null,
      summary: event.summary,
      timestamp: event.timestamp,
      metadata: {},
    };
  }

  static fromRow(row: TelemetryEventRow): RuntimeEvent {
    return {
      eventId: row.event_id,
      eventType: row.event_type as RuntimeEvent['eventType'],
      executionId: row.execution_id ?? '',
      nodeId: row.node_id ?? undefined,
      summary: row.summary,
      timestamp: row.timestamp,
    } as RuntimeEvent;
  }
}

export class IdempotencyMapper {
  static toRow(record: IdempotencyRecord): Record<string, unknown> {
    return {
      id: record.idempotencyKey,
      organization_id: record.organizationId,
      key: record.idempotencyKey,
      request_hash: record.requestHash,
      status: 'PROCESSED',
      response_payload: record.response,
      http_status: record.statusCode,
      resource_id: null,
      created_at: record.createdAt,
      expires_at: record.expiresAt ?? new Date(Date.now() + 86400000).toISOString(),
    };
  }

  static fromRow(row: IdempotencyRecordRow): IdempotencyRecord {
    return {
      idempotencyKey: row.key,
      organizationId: row.organization_id,
      requestHash: row.request_hash,
      response: row.response_payload,
      statusCode: row.http_status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }
}

export class OutboxEventMapper {
  static toRow(event: OutboxEvent): Record<string, unknown> {
    return {
      id: event.id,
      organization_id: event.organizationId,
      event_type: event.eventType,
      aggregate_id: event.aggregateId,
      payload: event.payload,
      status: event.status,
      retry_count: event.retryCount,
      max_retries: event.maxRetries,
      next_attempt_at: event.nextAttemptAt,
      last_error: event.lastError,
      published_at: event.publishedAt,
      created_at: event.createdAt,
      updated_at: event.updatedAt,
    };
  }

  static fromRow(row: OutboxEventRow): OutboxEvent {
    return {
      id: row.id,
      organizationId: row.organization_id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      payload: row.payload as Record<string, unknown>,
      status: row.status as OutboxEvent['status'],
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      nextAttemptAt: row.next_attempt_at,
      lastError: row.last_error,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class AuditLogMapper {
  static toRow(entry: AuditLogEntry): Record<string, unknown> {
    return {
      id: entry.auditLogId,
      organization_id: entry.organizationId,
      actor_id: entry.actorId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      result: entry.result,
      correlation_id: entry.correlationId,
      request_id: entry.requestId,
      metadata: entry.metadata,
      created_at: entry.timestamp,
    };
  }

  static fromRow(row: AuditLogRow): AuditLogEntry {
    return {
      auditLogId: row.id,
      organizationId: row.organization_id,
      actorId: row.actor_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      result: row.result as AuditLogEntry['result'],
      correlationId: row.correlation_id,
      requestId: row.request_id,
      metadata: row.metadata as Record<string, unknown>,
      timestamp: row.created_at,
    };
  }
}
