// ─── Planning blocked error ─────────────────────────────────────────────────────
// Thrown when the planning process cannot proceed due to blockers.

export class PlanningBlockedError extends Error {
  readonly blockers: string[];

  constructor(blockers: string[]) {
    super(`Planning blocked: ${blockers.join('; ')}`);
    this.name     = 'PlanningBlockedError';
    this.blockers = blockers;
  }
}
