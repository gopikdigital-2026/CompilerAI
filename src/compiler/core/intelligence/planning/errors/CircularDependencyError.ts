// ─── Circular dependency error ──────────────────────────────────────────────────
// Thrown when the execution graph contains a cycle.

export class CircularDependencyError extends Error {
  readonly cycle: string[];

  constructor(cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(' → ')}`);
    this.name  = 'CircularDependencyError';
    this.cycle = cycle;
  }
}
