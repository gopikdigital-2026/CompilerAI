// ─── Compilation request ──────────────────────────────────────────────────────

export interface CompilationRequest {
  sessionId:  string;
  prompt:     string;
  orgId?:     string;
  userId?:    string;
  /** Hint passed to the provider (e.g. 'gpt-4o', 'claude-3-5-sonnet'). */
  modelHint?: string;
  /** If true, skip cache and force a fresh compilation. */
  forceRefresh?: boolean;
}

// ─── Compilation result ───────────────────────────────────────────────────────

import type { Blueprint } from '../../../types/blueprint';
import type { ReasoningOutput } from '../interfaces/ICompilerCore';

export type CompilationStatus = 'success' | 'partial' | 'error';

export interface CompilationResult {
  sessionId:   string;
  status:      CompilationStatus;
  blueprint:   Blueprint | null;
  reasoning:   ReasoningOutput | null;
  durationMs:  number;
  provider:    string;
  model:       string;
  error?:      string;
  warnings:    string[];
  completedAt: string;   // ISO
}
