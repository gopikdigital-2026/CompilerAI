// ─── ToolDiscoveryService ───────────────────────────────────────────────────────
// Discovers tools from the registry that match the selection context.

import type { IToolDiscoveryService, ToolSelectionContext } from '../interfaces/IToolIntelligenceEngine';
import type { ToolDefinition } from '../models/ToolDefinition';
import type { IToolRegistry } from '../interfaces/IToolRegistry';
import type { RequiredCapability } from '../../intent/models/RequiredCapability';

export class ToolDiscoveryService implements IToolDiscoveryService {
  constructor(private readonly registry: IToolRegistry) {}

  discover(context: ToolSelectionContext): ToolDefinition[] {
    const requiredCapabilities = this.extractRequiredCapabilities(context);
    if (requiredCapabilities.length === 0) return this.registry.findAll();

    const discovered = new Map<string, ToolDefinition>();
    for (const cap of requiredCapabilities) {
      for (const tool of this.registry.findByCapability(cap)) {
        if (!discovered.has(tool.toolId)) discovered.set(tool.toolId, tool);
      }
    }
    return Array.from(discovered.values());
  }

  private extractRequiredCapabilities(context: ToolSelectionContext): RequiredCapability[] {
    if (context.intentResult?.requiredCapabilities && context.intentResult.requiredCapabilities.length > 0) {
      return context.intentResult.requiredCapabilities;
    }
    return [];
  }
}
