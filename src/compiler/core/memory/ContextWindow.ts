import type { WorkingMemory } from './WorkingMemory';

// ─── Context window manager ──────────────────────────────────────────────────
// Maintains a sliding context window for multi-turn or multi-stage compilation.

export interface ContextMessage {
  role:      'system' | 'user' | 'assistant';
  content:   string;
  stageId?:  string;
  tokens:    number;
}

const TOKEN_LIMIT = 8_000;   // conservative estimate; override per-provider

export class ContextWindow {
  private readonly messages: ContextMessage[] = [];
  private readonly memory: WorkingMemory;
  private readonly sessionId: string;
  private readonly maxTokens: number;

  constructor(memory: WorkingMemory, sessionId: string, maxTokens = TOKEN_LIMIT) {
    this.memory    = memory;
    this.sessionId = sessionId;
    this.maxTokens = maxTokens;
  }

  /** Append a message and evict oldest non-system messages if over budget. */
  push(msg: Omit<ContextMessage, 'tokens'>): void {
    const tokens = Math.ceil(msg.content.length / 4);
    this.messages.push({ ...msg, tokens });
    this.evict();
    this.memory.set(this.sessionId, 'context_window', this.messages);
  }

  /** Retrieve all current messages. */
  getMessages(): ContextMessage[] {
    return [...this.messages];
  }

  /** Total estimated tokens in the window. */
  totalTokens(): number {
    return this.messages.reduce((s, m) => s + m.tokens, 0);
  }

  /** Build a compact string summary for logging / display. */
  summarize(): string {
    return this.messages
      .filter(m => m.role !== 'system')
      .map(m => `[${m.stageId ?? m.role}] ${m.content.slice(0, 80)}`)
      .join('\n');
  }

  private evict(): void {
    // Keep system messages, evict oldest user/assistant when over limit
    while (this.totalTokens() > this.maxTokens) {
      const idx = this.messages.findIndex(m => m.role !== 'system');
      if (idx === -1) break;
      this.messages.splice(idx, 1);
    }
  }
}
