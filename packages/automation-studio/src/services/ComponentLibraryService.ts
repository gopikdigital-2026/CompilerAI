import type { ComponentDescriptor, ComponentLibraryCategory, ComponentBinding, ComponentLibrary } from '../models/ComponentModels';
import type {
  IMarketplaceAdapter,
  IAgentRuntimeAdapter,
  IToolIntelligenceAdapter,
} from '../integrations/IntegrationAdapters';
import { ComponentNotFoundError } from '../errors/AutomationStudioErrors';

export class ComponentLibraryService {
  private bindings = new Map<string, ComponentBinding[]>();

  constructor(
    private readonly marketplaceAdapter: IMarketplaceAdapter,
    private readonly agentRuntimeAdapter: IAgentRuntimeAdapter,
    private readonly toolIntelligenceAdapter: IToolIntelligenceAdapter,
  ) {}

  getAvailableComponents(organizationId: string, category?: ComponentLibraryCategory): ComponentDescriptor[] {
    const all: ComponentDescriptor[] = [];

    const tools = this.marketplaceAdapter.getAvailableTools(organizationId);
    all.push(...tools);

    const agents = this.agentRuntimeAdapter.getAvailableAgents(organizationId);
    all.push(...agents);

    if (category) {
      return all.filter((c) => c.category === category);
    }
    return all;
  }

  getComponent(id: string): ComponentDescriptor | null {
    const tools = this.marketplaceAdapter.getAvailableTools('');
    const found = tools.find((t) => t.id === id);
    if (found) return found;

    const agents = this.agentRuntimeAdapter.getAvailableAgents('');
    return agents.find((a) => a.id === id) ?? null;
  }

  checkAvailability(id: string): boolean {
    return this.getComponent(id) !== null;
  }

  bindComponent(workflowId: string, nodeId: string, componentId: string, category: ComponentLibraryCategory, config: Record<string, unknown>): ComponentBinding {
    if (!this.checkAvailability(componentId)) {
      throw new ComponentNotFoundError(`Component not available: ${componentId}`);
    }
    const binding: ComponentBinding = { nodeId, componentId, category, config };
    const list = this.bindings.get(workflowId) ?? [];
    list.push(binding);
    this.bindings.set(workflowId, list);
    return binding;
  }

  getBindings(workflowId: string): ComponentBinding[] {
    return this.bindings.get(workflowId) ?? [];
  }

  getComponentLibrary(organizationId: string, workflowId: string): ComponentLibrary {
    return {
      components: this.getAvailableComponents(organizationId),
      bindings: this.getBindings(workflowId),
    };
  }

  selectToolsForCapabilities(capabilities: string[], organizationId: string): ComponentDescriptor[] {
    return this.toolIntelligenceAdapter.selectTools(capabilities, organizationId);
  }

  validateToolBinding(toolId: string, nodeConfig: Record<string, unknown>): boolean {
    return this.toolIntelligenceAdapter.validateToolCompatibility(toolId, nodeConfig);
  }
}
