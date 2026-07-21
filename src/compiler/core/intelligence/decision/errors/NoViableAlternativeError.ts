// ─── No viable alternative error ────────────────────────────────────────────────

export class NoViableAlternativeError extends Error {
  readonly decisionId?: string;

  constructor(decisionId?: string) {
    super(
      decisionId
        ? `No viable alternative for decision "${decisionId}"`
        : 'No viable alternative found',
    );
    this.name      = 'NoViableAlternativeError';
    this.decisionId = decisionId;
  }
}
