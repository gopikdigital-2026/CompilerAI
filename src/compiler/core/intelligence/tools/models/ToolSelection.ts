// ─── Tool selection ─────────────────────────────────────────────────────────────
// Result of selecting a tool — includes ranking rationale.

export interface ToolSelectionRationale {
  factor:   string;
  score:    number;
  reason:   string;
}

export interface ToolSelection {
  selectionId:    string;
  toolId:         string;
  toolName:       string;
  rank:           number;
  totalScore:     number;   // 0–100
  rationales:     ToolSelectionRationale[];
  selected:       boolean;
  /** If this is a fallback selection, the tool it replaces. */
  fallbackForToolId: string | null;
}
