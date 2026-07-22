export type EntityId = string;
export type OrganizationId = string;
export type ExecutionId = string;
export type WorkflowId = string;
export type RequestId = string;
export type CorrelationId = string;
export type ActorId = string;
export type SessionId = string;
export type ApiKeyId = string;
export type RoleId = string;
export type UserId = string;
export type PlanId = string;
export type DecisionId = string;
export type CheckpointId = string;
export type ApprovalId = string;
export type TaskId = string;
export type ToolId = string;
export type MemoryId = string;
export type EventId = string;
export type TraceId = string;

export type IdGenerator = () => string;

export interface IdNamespace {
  prefix: string;
  generate(): string;
}

export function createNamespacedIdGenerator(
  baseGenerator: IdGenerator,
  prefix: string,
): IdNamespace {
  return {
    prefix,
    generate: () => `${prefix}_${baseGenerator()}`,
  };
}
