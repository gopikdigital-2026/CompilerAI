export type StudioEventType =
  | 'workflow.created'
  | 'workflow.published'
  | 'workflow.unpublished'
  | 'workflow.simulated'
  | 'workflow.imported'
  | 'workflow.exported'
  | 'workflow.duplicated'
  | 'workflow.archived'
  | 'workflow.version_tagged'
  | 'workflow.version_restored'
  | 'node.added'
  | 'node.removed'
  | 'node.updated'
  | 'connection.added'
  | 'connection.removed'
  | 'simulation.started'
  | 'simulation.completed'
  | 'simulation.failed'
  | 'deployment.published'
  | 'deployment.deactivated'
  | 'canvas.zoom_changed'
  | 'canvas.selection_changed'
  | 'copilot.workflow_imported';

export interface StudioEvent {
  type: StudioEventType;
  timestamp: string;
  organizationId: string | null;
  workflowId: string | null;
  userId: string | null;
  metadata: Record<string, unknown>;
}

export interface IStudioTelemetry {
  emit(event: StudioEvent): void;
  getEvents(): StudioEvent[];
  getEventsByType(type: StudioEventType): StudioEvent[];
  getEventsByWorkflow(workflowId: string): StudioEvent[];
  clear(): void;
}

/**
 * In-memory telemetry collector. Never logs PII — only stores structured
 * event metadata with the explicit ids provided by the caller.
 */
export class InMemoryStudioTelemetry implements IStudioTelemetry {
  private readonly events: StudioEvent[] = [];
  private readonly maxEvents: number = 10000;

  emit(event: StudioEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  getEvents(): StudioEvent[] {
    return [...this.events];
  }

  getEventsByType(type: StudioEventType): StudioEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  getEventsByWorkflow(workflowId: string): StudioEvent[] {
    return this.events.filter((e) => e.workflowId === workflowId);
  }

  clear(): void {
    this.events.length = 0;
  }
}
