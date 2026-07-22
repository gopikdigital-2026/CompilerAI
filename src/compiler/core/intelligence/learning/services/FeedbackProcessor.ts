// ─── FeedbackProcessor ──────────────────────────────────────────────────────────
// Processes human feedback into structured entries with keyword extraction and sentiment.

import type { IFeedbackProcessor } from '../interfaces/ILearningEngine';
import type { FeedbackEntry } from '../models/FeedbackEntry';

const POSITIVE_WORDS = ['good', 'great', 'excellent', 'correct', 'helpful', 'accurate', 'perfect', 'love', 'works', 'success'];
const NEGATIVE_WORDS = ['bad', 'wrong', 'incorrect', 'poor', 'terrible', 'fail', 'broken', 'hate', 'error', 'useless'];
const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'was', 'are', 'were', 'to', 'of', 'in', 'on', 'at', 'and', 'or', 'but', 'for', 'it', 'this', 'that', 'i', 'you', 'we', 'they']);

export class FeedbackProcessor implements IFeedbackProcessor {
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(idGenerator: () => string, clock: () => string) {
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  process(input: {
    organizationId: string;
    triggerId: string;
    text: string;
    rating: 'positive' | 'negative' | 'neutral';
  }): FeedbackEntry {
    const keywords = this.extractKeywords(input.text);
    const sentimentScore = this.computeSentiment(input.text, input.rating);

    return {
      feedbackId: this.idGenerator(),
      organizationId: input.organizationId,
      triggerId: input.triggerId,
      text: input.text,
      rating: input.rating,
      keywords,
      sentimentScore,
      timestamp: this.clock(),
    };
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
    return Array.from(new Set(words)).slice(0, 10);
  }

  private computeSentiment(text: string, rating: 'positive' | 'negative' | 'neutral'): number {
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    for (const word of words) {
      if (POSITIVE_WORDS.some(p => word.includes(p))) score += 20;
      if (NEGATIVE_WORDS.some(n => word.includes(n))) score -= 20;
    }
    // Adjust based on explicit rating
    if (rating === 'positive') score += 30;
    if (rating === 'negative') score -= 30;
    return Math.max(-100, Math.min(100, score));
  }
}
