export type ComponentLibraryCategory =
  | 'marketplace'
  | 'agent_runtime'
  | 'memory'
  | 'telemetry'
  | 'identity'
  | 'tool_intelligence';

export interface ComponentDescriptor {
  id: string;
  category: ComponentLibraryCategory;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  configSchema: Record<string, unknown>;
  available: boolean;
}

export interface ComponentBinding {
  nodeId: string;
  componentId: string;
  category: ComponentLibraryCategory;
  config: Record<string, unknown>;
}

export interface ComponentLibrary {
  components: ComponentDescriptor[];
  bindings: ComponentBinding[];
}

export interface ComponentSource {
  getComponents(category: ComponentLibraryCategory): ComponentDescriptor[];
  getComponent(id: string): ComponentDescriptor | null;
  checkAvailability(id: string): boolean;
}
