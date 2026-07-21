// ─── Decision blocked error ────────────────────────────────────────────────────

export class DecisionBlockedError extends Error {
  readonly blockers: string[];

  constructor(blockers: string[]) {
    super(`Decision blocked: ${blockers.join('; ')}`);
    this.name     = 'DecisionBlockedError';
    this.blockers = blockers;
  }
}
