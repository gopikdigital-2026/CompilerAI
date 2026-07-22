// ─── Tool capability ────────────────────────────────────────────────────────────
// Capabilities a tool provides — mapped to RequiredCapability from the Intent Engine.

import type { RequiredCapability } from '../../intent/models/RequiredCapability';

export type ToolCategory =
  | 'ANALYSIS'
  | 'DATA_ACCESS'
  | 'EXECUTION'
  | 'COMMUNICATION'
  | 'MONITORING'
  | 'UTILITY';

export const TOOL_CATEGORIES: readonly ToolCategory[] = [
  'ANALYSIS', 'DATA_ACCESS', 'EXECUTION', 'COMMUNICATION', 'MONITORING', 'UTILITY',
] as const;

export interface ToolCapability {
  capabilityId:    string;
  /** Maps to a RequiredCapability from the Intent Engine. */
  requiredCapability: RequiredCapability;
  /** Proficiency score 0–100 for this capability. */
  proficiency:     number;
  /** Optional sub-capability label (e.g., "time-series" for FORECASTING). */
  specialization:  string | null;
}
