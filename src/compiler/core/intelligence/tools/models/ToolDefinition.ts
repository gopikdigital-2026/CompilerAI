// ─── Tool definition ────────────────────────────────────────────────────────────
// Static definition of a tool registered in the Tool Registry.

import type { ToolCapability } from './ToolCapability';
import type { ToolRequirement } from './ToolRequirement';
import type { ToolCategory } from './ToolCapability';

export type ToolStatus = 'ACTIVE' | 'DEPRECATED' | 'DISABLED';

export interface ToolDefinition {
  toolId:          string;
  name:            string;
  description:     string;
  category:        ToolCategory;
  version:         string;
  status:          ToolStatus;
  capabilities:    ToolCapability[];
  requirements:    ToolRequirement;
  /** Default priority weight (0–100) for ranking. */
  priorityWeight:  number;
  /** Whether this tool can act as a fallback for another tool. */
  canFallback:     boolean;
  /** Tool IDs this tool can serve as a fallback for. */
  fallbackFor:     string[];
  tags:            string[];
  metadata:        Record<string, unknown>;
}
