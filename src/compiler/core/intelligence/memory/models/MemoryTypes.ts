// ─── Memory types ───────────────────────────────────────────────────────────────
// All memory type identifiers supported by the Memory Intelligence Engine.

export type MemoryType =
  | 'WORKING'
  | 'SESSION'
  | 'ORGANIZATION'
  | 'SEMANTIC'
  | 'EXECUTION';

export const MEMORY_TYPES: readonly MemoryType[] = [
  'WORKING', 'SESSION', 'ORGANIZATION', 'SEMANTIC', 'EXECUTION',
] as const;

/** Sensitivity classification for memory entries. */
export type MemorySensitivity =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED';

export const MEMORY_SENSITIVITIES: readonly MemorySensitivity[] = [
  'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED',
] as const;

/** Sensitivity levels that require explicit consent to store. */
export const SENSITIVE_LEVELS: readonly MemorySensitivity[] = [
  'CONFIDENTIAL', 'RESTRICTED',
] as const;

export function isSensitive(sensitivity: MemorySensitivity): boolean {
  return SENSITIVE_LEVELS.includes(sensitivity);
}
