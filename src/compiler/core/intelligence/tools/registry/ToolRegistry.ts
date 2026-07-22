// ─── ToolRegistry ───────────────────────────────────────────────────────────────
// In-memory tool registry. Swappable for future DB-backed registries.

import type { ToolDefinition } from '../models/ToolDefinition';
import type { ToolCategory } from '../models/ToolCapability';
import type { IToolRegistry } from '../interfaces/IToolRegistry';
import { ToolRegistryError } from '../errors/ToolErrors';

export class ToolRegistry implements IToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.toolId)) {
      throw new ToolRegistryError(`Tool already registered: ${tool.toolId}`);
    }
    this.tools.set(tool.toolId, tool);
  }

  unregister(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  findById(toolId: string): ToolDefinition | null {
    return this.tools.get(toolId) ?? null;
  }

  findByCategory(category: ToolCategory): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(t => t.category === category && t.status === 'ACTIVE');
  }

  findByCapability(requiredCapability: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(
      t => t.status === 'ACTIVE' && t.capabilities.some(c => c.requiredCapability === requiredCapability),
    );
  }

  findAll(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(t => t.status === 'ACTIVE');
  }

  count(): number {
    return this.tools.size;
  }

  clear(): void {
    this.tools.clear();
  }
}
