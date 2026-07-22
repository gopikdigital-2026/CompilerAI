// ─── IToolRegistry ──────────────────────────────────────────────────────────────
// Repository abstraction for tool definitions. In-memory default; swappable.

import type { ToolDefinition } from '../models/ToolDefinition';
import type { ToolCategory } from '../models/ToolCapability';

export interface IToolRegistry {
  register(tool: ToolDefinition): void;
  unregister(toolId: string): boolean;
  findById(toolId: string): ToolDefinition | null;
  findByCategory(category: ToolCategory): ToolDefinition[];
  findByCapability(requiredCapability: string): ToolDefinition[];
  findAll(): ToolDefinition[];
  count(): number;
  clear(): void;
}
