// ─── Route registration ─────────────────────────────────────────────────────────

import type { IRouteRegistry } from '../interfaces/HttpInterfaces';
import type { ExecutionController } from '../controllers/Controllers';
import type { WorkflowController } from '../controllers/Controllers';
import type { ApprovalController } from '../controllers/Controllers';
import type { TelemetryController } from '../controllers/Controllers';
import type { CapabilityController } from '../controllers/Controllers';
import type { HealthController } from '../controllers/Controllers';

export function registerRoutes(
  registry: IRouteRegistry,
  controllers: {
    execution: ExecutionController;
    workflow: WorkflowController;
    approval: ApprovalController;
    telemetry: TelemetryController;
    capability: CapabilityController;
    health: HealthController;
  },
): void {
  const v = '/api/v1';

  // ── Executions ──────────────────────────────────────────────────────────────
  registry.register('POST', `${v}/executions`, controllers.execution.create());
  registry.register('GET',  `${v}/executions/:executionId`, controllers.execution.get());
  registry.register('GET',  `${v}/executions/:executionId/result`, controllers.execution.getResult());
  registry.register('POST', `${v}/executions/:executionId/pause`, controllers.execution.pause());
  registry.register('POST', `${v}/executions/:executionId/resume`, controllers.execution.resume());
  registry.register('POST', `${v}/executions/:executionId/cancel`, controllers.execution.cancel());
  registry.register('GET',  `${v}/executions/:executionId/events`, controllers.execution.getEvents());
  registry.register('GET',  `${v}/executions/:executionId/trace`, controllers.execution.getTrace());

  // ── Workflows ────────────────────────────────────────────────────────────────
  registry.register('POST', `${v}/workflows`, controllers.workflow.create());
  registry.register('GET',  `${v}/workflows`, controllers.workflow.list());
  registry.register('GET',  `${v}/workflows/:workflowId`, controllers.workflow.get());
  registry.register('POST', `${v}/workflows/validate`, controllers.workflow.validate());
  registry.register('POST', `${v}/workflows/:workflowId/versions`, controllers.workflow.createVersion());
  registry.register('POST', `${v}/workflows/:workflowId/versions/:version/activate`, controllers.workflow.activateVersion());
  registry.register('POST', `${v}/workflows/:workflowId/deactivate`, controllers.workflow.deactivate());

  // ── Approvals ────────────────────────────────────────────────────────────────
  registry.register('GET',  `${v}/approvals`, controllers.approval.list());
  registry.register('GET',  `${v}/approvals/:approvalId`, controllers.approval.get());
  registry.register('POST', `${v}/approvals/:approvalId/approve`, controllers.approval.approve());
  registry.register('POST', `${v}/approvals/:approvalId/reject`, controllers.approval.reject());
  registry.register('POST', `${v}/approvals/:approvalId/request-changes`, controllers.approval.requestChanges());

  // ── Telemetry ────────────────────────────────────────────────────────────────
  registry.register('GET',  `${v}/executions/:executionId/telemetry`, controllers.telemetry.getEvents());

  // ── Platform ──────────────────────────────────────────────────────────────────
  registry.register('GET',  `${v}/capabilities`, controllers.capability.getCapabilities());
  registry.register('GET',  `${v}/health`, controllers.health.getHealth());
  registry.register('GET',  `${v}/ready`, controllers.health.getReady());
  registry.register('GET',  `${v}/version`, controllers.health.getVersion());
  registry.register('GET',  `${v}/openapi`, controllers.health.getOpenApi());
}
