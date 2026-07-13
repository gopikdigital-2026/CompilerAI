import type { StageStatus } from '../interfaces/IPipeline';

// ─── Compiler event types ─────────────────────────────────────────────────────

export type CompilerEventType =
  | 'compilation:started'
  | 'stage:started'
  | 'stage:progress'
  | 'stage:completed'
  | 'stage:error'
  | 'token:chunk'           // streaming token from LLM
  | 'compilation:completed'
  | 'compilation:error'
  | 'compilation:aborted';

// ─── Base event ───────────────────────────────────────────────────────────────

interface BaseEvent {
  type:      CompilerEventType;
  sessionId: string;
  timestamp: number;       // unix ms
}

// ─── Concrete event shapes ────────────────────────────────────────────────────

export interface CompilationStartedEvent extends BaseEvent {
  type:    'compilation:started';
  prompt:  string;
}

export interface StageStartedEvent extends BaseEvent {
  type:    'stage:started';
  stageId: string;
  label:   string;
}

export interface StageProgressEvent extends BaseEvent {
  type:     'stage:progress';
  stageId:  string;
  progress: number;         // 0–100
  message?: string;
}

export interface StageCompletedEvent extends BaseEvent {
  type:       'stage:completed';
  stageId:    string;
  durationMs: number;
  status:     StageStatus;
}

export interface StageErrorEvent extends BaseEvent {
  type:    'stage:error';
  stageId: string;
  error:   string;
}

export interface TokenChunkEvent extends BaseEvent {
  type:  'token:chunk';
  chunk: string;
}

export interface CompilationCompletedEvent extends BaseEvent {
  type:       'compilation:completed';
  durationMs: number;
}

export interface CompilationErrorEvent extends BaseEvent {
  type:  'compilation:error';
  error: string;
}

export interface CompilationAbortedEvent extends BaseEvent {
  type: 'compilation:aborted';
}

// ─── Union ─────────────────────────────────────────────────────────────────────

export type CompilerEvent =
  | CompilationStartedEvent
  | StageStartedEvent
  | StageProgressEvent
  | StageCompletedEvent
  | StageErrorEvent
  | TokenChunkEvent
  | CompilationCompletedEvent
  | CompilationErrorEvent
  | CompilationAbortedEvent;

// ─── Factory helpers ──────────────────────────────────────────────────────────

export function makeEvent<T extends CompilerEvent>(
  type: T['type'],
  sessionId: string,
  payload: Omit<T, 'type' | 'sessionId' | 'timestamp'>,
): T {
  return { type, sessionId, timestamp: Date.now(), ...payload } as T;
}
