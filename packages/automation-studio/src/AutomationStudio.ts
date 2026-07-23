import type { AutomationStudioRepository } from './repositories/RepositoryInterfaces';
import { InMemoryAutomationStudioRepository } from './repositories/InMemoryRepository';

import { NodeRegistry } from './designer/NodeRegistry';
import { WorkflowValidator } from './designer/WorkflowValidator';
import { WorkflowBuilder } from './designer/WorkflowBuilder';

import { WorkflowService } from './services/WorkflowService';
import { TemplateLibrary } from './services/TemplateLibrary';
import { TemplateService } from './services/TemplateService';
import { SimulationEngine } from './services/SimulationEngine';
import { PublishingService } from './services/PublishingService';
import { MonitorService } from './services/MonitorService';
import { CollaborationService } from './services/CollaborationService';
import { ComponentLibraryService } from './services/ComponentLibraryService';
import { SecurityService } from './services/SecurityService';

import type {
  IRuntimeAdapter,
  ITelemetryAdapter,
  IIdentityAdapter,
  IMarketplaceAdapter,
  IAgentRuntimeAdapter,
  IMemoryAdapter,
  IToolIntelligenceAdapter,
  IMonitorAdapter,
} from './integrations/IntegrationAdapters';
import {
  NullRuntimeAdapter,
  NullTelemetryAdapter,
  NullIdentityAdapter,
  NullMarketplaceAdapter,
  NullAgentRuntimeAdapter,
  NullMemoryAdapter,
  NullToolIntelligenceAdapter,
  NullMonitorAdapter,
} from './integrations/IntegrationAdapters';

export interface AutomationStudioDeps {
  repository?: AutomationStudioRepository;
  runtimeAdapter?: IRuntimeAdapter;
  telemetryAdapter?: ITelemetryAdapter;
  identityAdapter?: IIdentityAdapter;
  marketplaceAdapter?: IMarketplaceAdapter;
  agentRuntimeAdapter?: IAgentRuntimeAdapter;
  memoryAdapter?: IMemoryAdapter;
  toolIntelligenceAdapter?: IToolIntelligenceAdapter;
  monitorAdapter?: IMonitorAdapter;
  idGenerator: () => string;
  clock: () => string;
}

export class AutomationStudio {
  readonly id = 'automation-studio-v1';

  readonly repository: AutomationStudioRepository;
  readonly nodeRegistry: NodeRegistry;
  readonly validator: WorkflowValidator;
  readonly builder: WorkflowBuilder;
  readonly workflows: WorkflowService;
  readonly templates: TemplateService;
  readonly templateLibrary: TemplateLibrary;
  readonly simulation: SimulationEngine;
  readonly publishing: PublishingService;
  readonly monitor: MonitorService;
  readonly collaboration: CollaborationService;
  readonly components: ComponentLibraryService;
  readonly security: SecurityService;

  readonly runtimeAdapter: IRuntimeAdapter;
  readonly telemetryAdapter: ITelemetryAdapter;
  readonly identityAdapter: IIdentityAdapter;
  readonly marketplaceAdapter: IMarketplaceAdapter;
  readonly agentRuntimeAdapter: IAgentRuntimeAdapter;
  readonly memoryAdapter: IMemoryAdapter;
  readonly toolIntelligenceAdapter: IToolIntelligenceAdapter;
  readonly monitorAdapter: IMonitorAdapter;

  constructor(deps: AutomationStudioDeps) {
    this.repository = deps.repository ?? new InMemoryAutomationStudioRepository();

    this.runtimeAdapter = deps.runtimeAdapter ?? new NullRuntimeAdapter();
    this.telemetryAdapter = deps.telemetryAdapter ?? new NullTelemetryAdapter();
    this.identityAdapter = deps.identityAdapter ?? new NullIdentityAdapter();
    this.marketplaceAdapter = deps.marketplaceAdapter ?? new NullMarketplaceAdapter();
    this.agentRuntimeAdapter = deps.agentRuntimeAdapter ?? new NullAgentRuntimeAdapter();
    this.memoryAdapter = deps.memoryAdapter ?? new NullMemoryAdapter();
    this.toolIntelligenceAdapter = deps.toolIntelligenceAdapter ?? new NullToolIntelligenceAdapter();
    this.monitorAdapter = deps.monitorAdapter ?? new NullMonitorAdapter();

    this.nodeRegistry = new NodeRegistry();
    this.validator = new WorkflowValidator(this.nodeRegistry);
    this.builder = new WorkflowBuilder(
      this.repository.workflows,
      this.nodeRegistry,
      this.validator,
      deps.idGenerator,
      deps.clock,
    );

    this.workflows = new WorkflowService(this.repository.workflows, deps.idGenerator, deps.clock);
    this.templateLibrary = new TemplateLibrary();
    this.templates = new TemplateService(this.templateLibrary, this.repository.workflows, deps.idGenerator, deps.clock);
    this.simulation = new SimulationEngine(
      this.repository.simulations,
      this.validator,
      this.runtimeAdapter,
      this.telemetryAdapter,
      this.agentRuntimeAdapter,
      this.memoryAdapter,
      deps.idGenerator,
      deps.clock,
    );
    this.publishing = new PublishingService(
      this.repository.workflows,
      this.repository.publications,
      this.validator,
      this.runtimeAdapter,
      deps.idGenerator,
      deps.clock,
    );
    this.monitor = new MonitorService(
      this.repository.monitors,
      this.monitorAdapter,
      deps.idGenerator,
      deps.clock,
    );
    this.collaboration = new CollaborationService(
      this.repository.comments,
      this.repository.reviews,
      this.repository.changeHistory,
      deps.idGenerator,
      deps.clock,
    );
    this.components = new ComponentLibraryService(
      this.marketplaceAdapter,
      this.agentRuntimeAdapter,
      this.toolIntelligenceAdapter,
    );
    this.security = new SecurityService(
      this.identityAdapter,
      this.validator,
      this.repository.changeHistory,
      deps.idGenerator,
      deps.clock,
    );
  }

  clear(): void {
    if (this.repository instanceof InMemoryAutomationStudioRepository) {
      this.repository.clear();
    }
  }
}
