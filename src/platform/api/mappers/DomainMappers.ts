// ─── Domain ↔ DTO mappers ───────────────────────────────────────────────────────

import type { RuntimeExecution } from '../../../compiler/runtime/models/RuntimeExecution';
import type { RuntimeResult } from '../../../compiler/runtime/models/RuntimeResult';
import type { RuntimeEvent } from '../../../compiler/runtime/models/RuntimeEvent';
import type { WorkflowDefinition } from '../../../compiler/runtime/models/WorkflowModels';
import type { ApprovalRequest } from '../../../compiler/runtime/models/ApprovalModels';
import type {
  ExecutionResponseDto, ExecutionResultResponseDto, WorkflowResponseDto,
  ApprovalResponseDto, TelemetryEventResponseDto, ExecutionTraceResponseDto,
} from '../dto/ApiDtos';

export class ExecutionMapper {
  static toResponse(exec: RuntimeExecution, basePath: string): ExecutionResponseDto {
    return {
      executionId: exec.executionId,
      status: exec.status,
      createdAt: exec.startedAt,
      links: {
        self: `${basePath}/${exec.executionId}`,
        events: `${basePath}/${exec.executionId}/events`,
      },
    };
  }

  static toResultResponse(result: RuntimeResult): ExecutionResultResponseDto {
    return {
      executionId: result.executionId,
      status: result.status,
      intelligenceResult: result.intelligenceResult as Record<string, unknown> | null,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      durationMs: result.durationMs,
      warnings: result.warnings,
      errors: result.errors,
    };
  }
}

export class WorkflowMapper {
  static toResponse(def: WorkflowDefinition, active: boolean): WorkflowResponseDto {
    return {
      workflowId: def.workflowId,
      organizationId: def.organizationId,
      name: def.name,
      description: def.description,
      nodes: def.nodes.map(n => ({
        nodeId: n.nodeId, type: n.type, label: n.label, order: n.order,
        dependsOn: n.dependsOn, requiresApproval: n.requiresApproval,
      })),
      edges: def.edges.map(e => ({
        sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId, condition: e.condition,
      })),
      mode: def.mode,
      version: def.version,
      contentHash: def.contentHash,
      createdAt: def.createdAt,
      active,
    };
  }
}

export class ApprovalMapper {
  static toResponse(approval: ApprovalRequest): ApprovalResponseDto {
    return {
      approvalId: approval.approvalId,
      executionId: approval.executionId,
      nodeId: approval.nodeId,
      nodeLabel: approval.nodeLabel,
      reason: approval.reason,
      description: approval.description,
      riskLevel: approval.riskLevel,
      confidenceScore: approval.confidenceScore,
      status: approval.status,
      createdAt: approval.createdAt,
    };
  }
}

export class TelemetryMapper {
  static toEventResponse(event: RuntimeEvent): TelemetryEventResponseDto {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      executionId: event.executionId,
      timestamp: event.timestamp,
      summary: event.summary,
      nodeId: event.nodeId,
    };
  }

  static toTraceResponse(executionId: string, events: RuntimeEvent[]): ExecutionTraceResponseDto {
    return {
      executionId,
      stages: events
        .filter(e => e.eventType.startsWith('WorkflowNode') || e.eventType.startsWith('Runtime'))
        .map(e => ({
          stage: e.nodeId ?? e.eventType,
          startedAt: e.timestamp,
          completedAt: e.timestamp,
          success: !e.eventType.includes('Failed'),
          summary: e.summary,
        })),
    };
  }
}

export class ErrorMapper {
  static toApiError(err: unknown): { code: string; message: string; httpStatus: number; details: unknown[] } {
    if (err instanceof Error) {
      const code = (err as { code?: string }).code ?? 'INTERNAL_ERROR';
      const httpStatus = (err as { httpStatus?: number }).httpStatus ?? 500;
      return { code, message: err.message, httpStatus, details: [] };
    }
    return { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', httpStatus: 500, details: [] };
  }
}
