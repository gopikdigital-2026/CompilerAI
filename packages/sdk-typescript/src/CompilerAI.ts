import { ResolvedConfig } from './config/CompilerAIConfig';
import type { CompilerAIConfig } from './config/CompilerAIConfig';
import { HttpTransport } from './transport/HttpTransport';
import { ExecutionsResource } from './resources/executions';
import { WorkflowsResource } from './resources/workflows';
import { ApprovalsResource } from './resources/approvals';
import { TelemetryResource } from './resources/telemetry';
import { MemoryResource } from './resources/memory';
import { ToolsResource } from './resources/tools';
import { HealthResource } from './resources/health';

export class CompilerAI {
  readonly config: ResolvedConfig;
  readonly transport: HttpTransport;
  readonly executions: ExecutionsResource;
  readonly workflows: WorkflowsResource;
  readonly approvals: ApprovalsResource;
  readonly telemetry: TelemetryResource;
  readonly memory: MemoryResource;
  readonly tools: ToolsResource;
  readonly health: HealthResource;

  constructor(input: CompilerAIConfig) {
    this.config = new ResolvedConfig(input);
    this.transport = new HttpTransport(this.config);
    this.executions = new ExecutionsResource(this.transport);
    this.workflows = new WorkflowsResource(this.transport);
    this.approvals = new ApprovalsResource(this.transport);
    this.telemetry = new TelemetryResource(this.transport);
    this.memory = new MemoryResource(this.transport);
    this.tools = new ToolsResource(this.transport);
    this.health = new HealthResource(this.transport);
  }
}
