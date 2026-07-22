// ─── Tool event ─────────────────────────────────────────────────────────────────
// Events emitted by the Tool Intelligence Engine.

import type { ToolCategory } from './ToolCapability';

export type ToolEventType =
  | 'ToolSelected'
  | 'ToolRejected'
  | 'ToolFallbackUsed'
  | 'ToolPlanBuilt'
  | 'ToolPlanBlocked';

export interface ToolEvent {
  eventId:        string;
  eventType:      ToolEventType;
  executionId:    string;
  organizationId: string;
  timestamp:      string;
  summary:        string;
  toolId:         string | null;
  toolCategory:   ToolCategory | null;
  metadata:       Record<string, unknown>;
}
