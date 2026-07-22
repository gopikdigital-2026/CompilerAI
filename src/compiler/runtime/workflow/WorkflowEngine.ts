// ─── WorkflowEngine ─────────────────────────────────────────────────────────────
// Coordinates workflow definition validation, graph building, scheduling, and running.

import type { WorkflowDefinition, WorkflowExecution } from '../models/WorkflowModels';
import type { RuntimeExecution } from '../models/RuntimeExecution';
import type { WorkflowRunContext } from '../interfaces/RuntimeInterfaces';
import { WorkflowDefinitionValidator } from './WorkflowDefinitionValidator';
import { WorkflowGraphBuilder } from './WorkflowGraphBuilder';
import { WorkflowScheduler } from './WorkflowScheduler';
import { WorkflowRunner } from './WorkflowRunner';
import type { InMemoryWorkflowRepository } from '../repositories/InMemoryRepositories';

export class WorkflowEngine {
  private readonly validator: WorkflowDefinitionValidator;
  private readonly graphBuilder: WorkflowGraphBuilder;
  private readonly scheduler: WorkflowScheduler;
  private readonly runner: WorkflowRunner;
  private readonly repository: InMemoryWorkflowRepository;
  
  constructor(repository: InMemoryWorkflowRepository, idGenerator: () => string, clock: () => string) {
    this.repository = repository;
        this.validator = new WorkflowDefinitionValidator();
    this.graphBuilder = new WorkflowGraphBuilder(clock);
    this.scheduler = new WorkflowScheduler();
    this.runner = new WorkflowRunner(idGenerator, clock);
  }

  buildDefaultPipeline(organizationId: string): WorkflowDefinition {
    const def = this.graphBuilder.buildDefaultPipeline(organizationId);
    this.repository.saveDefinition(def);
    return def;
  }

  validateDefinition(def: WorkflowDefinition): { valid: boolean; errors: string[] } {
    return this.validator.validate(def);
  }

  scheduleExecution(def: WorkflowDefinition): string[][] {
    return this.scheduler.schedule(def, def.mode);
  }

  async runWorkflow(execution: RuntimeExecution, definition: WorkflowDefinition, context: WorkflowRunContext): Promise<WorkflowExecution> {
    const wfExec = await this.runner.run(execution, definition, context);
    this.repository.saveExecution(wfExec);
    return wfExec;
  }

  getScheduler(): WorkflowScheduler { return this.scheduler; }
  getGraphBuilder(): WorkflowGraphBuilder { return this.graphBuilder; }
  getValidator(): WorkflowDefinitionValidator { return this.validator; }
  getRunner(): WorkflowRunner { return this.runner; }
  getRepository(): InMemoryWorkflowRepository { return this.repository; }
}
