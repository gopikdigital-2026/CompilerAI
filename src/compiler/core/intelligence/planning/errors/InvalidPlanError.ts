// ─── Invalid plan error ─────────────────────────────────────────────────────────
// Thrown when a plan is structurally incoherent and cannot be salvaged.
// Never includes sensitive business data in the message.

export class InvalidPlanError extends Error {
  readonly planId?: string;
  readonly code:    string;

  constructor(code: string, message: string, planId?: string) {
    super(message);
    this.name   = 'InvalidPlanError';
    this.code   = code;
    this.planId = planId;
  }
}
