// ─── Business intent (re-exported) ─────────────────────────────────────────────
// The coarse-grained intent produced by the Context Intelligence Layer.
// Re-exported here to avoid duplicating the canonical definition in
// `intelligence/models/BusinessContext.ts`. The Intent Engine layers the
// richer `IntentCategory` on top of this signal.

export type { BusinessIntent, Urgency } from '../../models/BusinessContext';
