import type { ToolManifest } from '../models/ToolManifest';
import type { IMarketplaceRepository } from './MarketplaceRepository';
import { ToolNotFoundError } from '../errors/MarketplaceErrors';

export class ToolRegistry {
  constructor(private readonly repo: IMarketplaceRepository) {}

  register(manifest: ToolManifest): void {
    this.repo.registerTool(manifest);
  }

  get(toolId: string): ToolManifest {
    const tool = this.repo.getTool(toolId);
    if (!tool) throw new ToolNotFoundError(`Tool not found: ${toolId}`);
    return tool;
  }

  tryGet(toolId: string): ToolManifest | null {
    return this.repo.getTool(toolId);
  }

  list(): ToolManifest[] {
    return this.repo.getAllTools();
  }

  exists(toolId: string): boolean {
    return this.repo.getTool(toolId) !== null;
  }

  unregister(toolId: string): void {
    if (!this.repo.removeTool(toolId)) {
      throw new ToolNotFoundError(`Cannot unregister — tool not found: ${toolId}`);
    }
  }
}
