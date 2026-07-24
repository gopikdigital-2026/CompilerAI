export type CopilotEventType =
  | 'workflow.generated'
  | 'workflow.validated'
  | 'workflow.simulated'
  | 'workflow.execution_requested'
  | 'workflow.failed_validation';

export interface CopilotEventMetadata {
  stepCount?: number;
  connectorCount?: number;
  validationErrorCount?: number;
  validationWarningCount?: number;
  estimatedDurationMs?: number;
  parserConfidence?: number;
  domain?: string;
  simulationSuccess?: boolean;
  // NEVER include: instruction text, user data, emails, names, file contents
}

export interface CopilotEvent {
  type: CopilotEventType;
  timestamp: string;
  workflowId: string;
  metadata: CopilotEventMetadata;
}

export interface ICopilotTelemetry {
  emit(event: CopilotEvent): void;
  getEvents(): CopilotEvent[];
  clear(): void;
}
