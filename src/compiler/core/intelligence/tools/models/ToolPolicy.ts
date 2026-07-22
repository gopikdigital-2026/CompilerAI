// ─── Tool policy ────────────────────────────────────────────────────────────────
// Organizational policies that govern tool selection.

import type { MemorySensitivity } from '../../memory/models/MemoryTypes';
import type { ToolPermission } from './ToolRequirement';

export interface ToolPolicy {
  policyId:         string;
  organizationId:   string;
  /** Tools explicitly allowed for this organization. Empty = all allowed. */
  allowedToolIds:   string[];
  /** Tools explicitly denied for this organization. */
  deniedToolIds:    string[];
  /** Permissions granted to this organization. */
  grantedPermissions: ToolPermission[];
  /** Maximum data sensitivity tools can process for this org. */
  maxDataSensitivity: MemorySensitivity;
  /** Whether the organization has consented to tool usage. */
  consentGranted:   boolean;
  /** Organization tier (e.g., "free", "pro", "enterprise"). */
  orgTier:          string;
  /** Whether fallback selection is permitted. */
  allowFallback:    boolean;
}
