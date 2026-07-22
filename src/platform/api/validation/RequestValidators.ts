// ─── Request validators ─────────────────────────────────────────────────────────

import type { CreateExecutionRequestDto } from '../dto/ApiDtos';
import type { CreateWorkflowRequestDto } from '../dto/ApiDtos';
import type { ApprovalDecisionRequestDto } from '../dto/ApiDtos';
import type { PaginationRequestDto } from '../dto/ApiDtos';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export class RequestValidator {
  protected static isString(val: unknown): val is string {
    return typeof val === 'string' && val.length > 0;
  }

  protected static isObject(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
  }
}

export class ExecutionRequestValidator extends RequestValidator {
  static validateCreate(body: unknown): { valid: boolean; errors: string[]; dto?: CreateExecutionRequestDto } {
    const errors: string[] = [];
    if (!this.isObject(body)) { errors.push('Body must be an object.'); return { valid: false, errors }; }
    const b = body as Record<string, unknown>;
    if (!this.isString(b.workflowId)) errors.push('workflowId is required.');
    if (!this.isString(b.idempotencyKey)) errors.push('idempotencyKey is required.');
    if (b.input !== undefined && !this.isObject(b.input)) errors.push('input must be an object.');
    if (errors.length > 0) return { valid: false, errors };
    const dto: CreateExecutionRequestDto = {
      workflowId: b.workflowId as string,
      input: (b.input as Record<string, unknown>) ?? {},
      idempotencyKey: b.idempotencyKey as string,
      metadata: b.metadata as Record<string, unknown> | undefined,
    };
    return { valid: true, errors: [], dto };
  }
}

export class WorkflowRequestValidator extends RequestValidator {
  static validateCreate(body: unknown): { valid: boolean; errors: string[]; dto?: CreateWorkflowRequestDto } {
    const errors: string[] = [];
    if (!this.isObject(body)) { errors.push('Body must be an object.'); return { valid: false, errors }; }
    const b = body as Record<string, unknown>;
    if (!this.isString(b.name)) errors.push('name is required.');
    if (!this.isString(b.description)) errors.push('description is required.');
    if (!Array.isArray(b.nodes) || b.nodes.length === 0) errors.push('nodes must be a non-empty array.');
    if (!Array.isArray(b.edges)) errors.push('edges must be an array.');
    if (b.mode !== 'SEQUENTIAL' && b.mode !== 'DAG') errors.push('mode must be SEQUENTIAL or DAG.');
    if (errors.length > 0) return { valid: false, errors };
    const dto: CreateWorkflowRequestDto = {
      name: b.name as string,
      description: b.description as string,
      nodes: b.nodes as CreateWorkflowRequestDto['nodes'],
      edges: b.edges as CreateWorkflowRequestDto['edges'],
      mode: b.mode as 'SEQUENTIAL' | 'DAG',
    };
    return { valid: true, errors: [], dto };
  }
}

export class ApprovalRequestValidator extends RequestValidator {
  static validateDecision(body: unknown): { valid: boolean; errors: string[]; dto?: ApprovalDecisionRequestDto } {
    const errors: string[] = [];
    if (!this.isObject(body)) { errors.push('Body must be an object.'); return { valid: false, errors }; }
    const b = body as Record<string, unknown>;
    if (!this.isString(b.comment)) errors.push('comment is required.');
    if (errors.length > 0) return { valid: false, errors };
    const dto: ApprovalDecisionRequestDto = {
      comment: b.comment as string,
      metadata: b.metadata as Record<string, unknown> | undefined,
    };
    return { valid: true, errors: [], dto };
  }
}

export class PaginationValidator extends RequestValidator {
  static validate(query: Record<string, string>): PaginationRequestDto {
    const limit = Math.min(parseInt(query.limit ?? '20', 10) || DEFAULT_LIMIT, MAX_LIMIT);
    return {
      limit,
      cursor: query.cursor ?? null,
      sort: query.sort ?? 'createdAt',
      status: query.status ?? null,
      createdFrom: query.createdFrom ?? null,
      createdTo: query.createdTo ?? null,
    };
  }
}
