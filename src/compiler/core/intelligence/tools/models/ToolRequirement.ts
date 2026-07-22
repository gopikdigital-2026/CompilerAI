// ─── Tool requirement ───────────────────────────────────────────────────────────
// Requirements a tool has to be eligible for selection.

import type { MemorySensitivity } from '../../memory/models/MemoryTypes';

export type ToolPermission =
  | 'READ_PUBLIC'
  | 'READ_INTERNAL'
  | 'READ_CONFIDENTIAL'
  | 'READ_RESTRICTED'
  | 'WRITE_PUBLIC'
  | 'WRITE_INTERNAL'
  | 'WRITE_CONFIDENTIAL'
  | 'EXECUTE'
  | 'ADMIN';

export const TOOL_PERMISSIONS: readonly ToolPermission[] = [
  'READ_PUBLIC', 'READ_INTERNAL', 'READ_CONFIDENTIAL', 'READ_RESTRICTED',
  'WRITE_PUBLIC', 'WRITE_INTERNAL', 'WRITE_CONFIDENTIAL',
  'EXECUTE', 'ADMIN',
] as const;

export interface ToolRequirement {
  /** Permissions the tool needs from the organization. */
  requiredPermissions:  ToolPermission[];
  /** Maximum data sensitivity the tool is allowed to process. */
  maxDataSensitivity:   MemorySensitivity;
  /** Whether the tool requires explicit organizational consent. */
  requiresConsent:      boolean;
  /** Whether the tool is restricted to certain organization tiers. */
  requiredOrgTiers:     string[];
  /** Other tool IDs this tool is incompatible with. */
  incompatibleWith:     string[];
  /** Minimum confidence score (0–100) required to select this tool. */
  minConfidenceThreshold: number;
}
