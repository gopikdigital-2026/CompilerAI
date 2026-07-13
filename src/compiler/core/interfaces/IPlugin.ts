import type { PipelineContext } from './IPipeline';

// ─── Plugin / Tool interface ──────────────────────────────────────────────────

export interface IPlugin {
  readonly id:          string;
  readonly name:        string;
  readonly description: string;
  readonly version:     string;

  /** Called once before the pipeline starts. */
  initialize?(): Promise<void>;

  /** Execute the plugin within a pipeline stage. */
  execute(input: unknown, ctx: PipelineContext): Promise<unknown>;

  /** Called after the pipeline completes (for cleanup). */
  teardown?(): Promise<void>;
}

// ─── Plugin registry ─────────────────────────────────────────────────────────

export interface IPluginRegistry {
  register(plugin: IPlugin): void;
  get(id: string): IPlugin | undefined;
  list(): IPlugin[];
}
