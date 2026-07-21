// ─── Invalid decision input error ──────────────────────────────────────────────
// Never includes sensitive business data in the message.

export class InvalidDecisionInputError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'InvalidDecisionInputError';
    this.code = code;
  }
}
