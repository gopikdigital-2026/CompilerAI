// ─── Tool policies ──────────────────────────────────────────────────────────────
// Business rules for tool selection, permission checks, and sensitivity enforcement.

import type { ToolDefinition } from '../models/ToolDefinition';
import type { ToolPolicy } from '../models/ToolPolicy';
import type { ToolPermission } from '../models/ToolRequirement';
import type { MemorySensitivity } from '../../memory/models/MemoryTypes';

const SENSITIVITY_ORDER: MemorySensitivity[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

/** Policy: check if a tool is explicitly allowed by org policy. */
export function isToolAllowed(tool: ToolDefinition, policy: ToolPolicy): boolean {
  if (policy.deniedToolIds.includes(tool.toolId)) return false;
  if (policy.allowedToolIds.length > 0 && !policy.allowedToolIds.includes(tool.toolId)) return false;
  return true;
}

/** Policy: check if the org has the required permissions for a tool. */
export function hasRequiredPermissions(required: ToolPermission[], granted: ToolPermission[]): boolean {
  return required.every(p => granted.includes(p));
}

/** Policy: check if the tool's data sensitivity is within org limits. */
export function isWithinSensitivityLimit(toolMax: MemorySensitivity, orgMax: MemorySensitivity): boolean {
  return SENSITIVITY_ORDER.indexOf(toolMax) <= SENSITIVITY_ORDER.indexOf(orgMax);
}

/** Policy: check if consent is required and granted. */
export function checkConsent(requiresConsent: boolean, consentGranted: boolean): boolean {
  return !requiresConsent || consentGranted;
}

/** Policy: check org tier. */
export function checkOrgTier(requiredTiers: string[], orgTier: string): boolean {
  if (requiredTiers.length === 0) return true;
  return requiredTiers.includes(orgTier);
}

/** Policy: check tool-to-tool incompatibility. */
export function findIncompatibleTools(
  selected: ToolDefinition[],
): Array<{ toolA: string; toolB: string; reason: string }> {
  const conflicts: Array<{ toolA: string; toolB: string; reason: string }> = [];
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const a = selected[i];
      const b = selected[j];
      if (a.requirements.incompatibleWith.includes(b.toolId)) {
        conflicts.push({ toolA: a.toolId, toolB: b.toolId, reason: `${a.toolId} declares incompatibility with ${b.toolId}` });
      } else if (b.requirements.incompatibleWith.includes(a.toolId)) {
        conflicts.push({ toolA: a.toolId, toolB: b.toolId, reason: `${b.toolId} declares incompatibility with ${a.toolId}` });
      }
    }
  }
  return conflicts;
}

/** Policy: check minimum confidence threshold. */
export function meetsConfidenceThreshold(toolMin: number, actualConfidence: number): boolean {
  return actualConfidence >= toolMin;
}
