// ─── Memory event ───────────────────────────────────────────────────────────────
// Events emitted by the Memory Intelligence Engine, compatible with Telemetry.

import type { MemoryType } from './MemoryTypes';

export type MemoryEventType =
  | 'MemoryWritten'
  | 'MemoryRetrieved'
  | 'MemoryExpired'
  | 'MemoryDeleted'
  | 'MemoryConsolidated'
  | 'MemoryBlocked';

/** Memory event — shares base fields with TelemetryEvent but uses its own eventType union. */
export interface MemoryEvent {
  eventId:        string;
  eventType:      MemoryEventType;
  executionId:    string;
  requestId:      string;
  organizationId: string;
  timestamp:      string;   // ISO
  summary:        string;
  metadata:       Record<string, unknown>;
  memoryType:     MemoryType | null;
  memoryId:       string | null;
}
