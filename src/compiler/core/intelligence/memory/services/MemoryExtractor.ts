// ─── MemoryExtractor ────────────────────────────────────────────────────────────
// Extracts memory write requests from raw pipeline inputs.

import type { IMemoryExtractor } from '../interfaces/IMemoryEngine';
import type { MemoryWriteRequest } from '../interfaces/IMemoryEngine';
import type { MemorySensitivity } from '../models/MemoryTypes';

export class MemoryExtractor implements IMemoryExtractor {
  extract(input: { prompt: string; organizationId: string; executionId?: string }): MemoryWriteRequest[] {
    const requests: MemoryWriteRequest[] = [];

    // Extract working memory from the prompt itself.
    requests.push({
      organizationId: input.organizationId,
      executionId: input.executionId ?? undefined,
      type: 'WORKING',
      content: this.sanitize(input.prompt),
      source: 'user_prompt',
      confidence: 70,
      relevance: 90,
      sensitivity: this.classifySensitivity(input.prompt),
      consentGranted: false,
      tags: ['prompt'],
    });

    // Extract a session-level summary.
    const summary = this.sanitize(input.prompt).slice(0, 200);
    requests.push({
      organizationId: input.organizationId,
      executionId: input.executionId ?? undefined,
      type: 'SESSION',
      content: `Session started: ${summary}`,
      source: 'session_tracker',
      confidence: 50,
      relevance: 60,
      sensitivity: 'INTERNAL',
      consentGranted: true,
      tags: ['session'],
      sessionId: input.executionId ?? 'default',
      sequenceNumber: 1,
    });

    return requests;
  }

  /** Remove obvious sensitive patterns from content before storage. */
  private sanitize(text: string): string {
    return text
      .replace(/password\s*=\s*\S+/gi, 'password=[REDACTED]')
      .replace(/apikey\s*=\s*\S+/gi, 'apikey=[REDACTED]')
      .replace(/token\s*=\s*\S+/gi, 'token=[REDACTED]')
      .replace(/secret\s*=\s*\S+/gi, 'secret=[REDACTED]');
  }

  /** Classify sensitivity based on keyword detection. */
  private classifySensitivity(text: string): MemorySensitivity {
    const lower = text.toLowerCase();
    if (/\b(password|secret|token|apikey|credential)\b/i.test(lower)) return 'RESTRICTED';
    if (/\b(confidential|private|internal)\b/i.test(lower)) return 'CONFIDENTIAL';
    if (/\b(organization|company|team)\b/i.test(lower)) return 'INTERNAL';
    return 'PUBLIC';
  }
}
