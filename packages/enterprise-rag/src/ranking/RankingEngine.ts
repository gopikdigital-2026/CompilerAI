import type { RankedResult, RankingFactors, RetrievalResult } from '../models.js';

const SOURCE_TRUST: Record<string, number> = {
  knowledge_graph: 1.0,
  github: 0.85,
  google_drive: 0.75,
  gmail: 0.70,
};

const WEIGHTS = {
  similarity: 0.40,
  recency: 0.15,
  authority: 0.15,
  usageFrequency: 0.10,
  sourceTrust: 0.20,
};

export class RankingEngine {
  private readonly usageCounts: Map<string, number> = new Map();
  private readonly authorAuthority: Map<string, number> = new Map();

  setUsageCount(chunkId: string, count: number): void {
    this.usageCounts.set(chunkId, count);
  }

  setAuthorAuthority(author: string, authority: number): void {
    this.authorAuthority.set(author, authority);
  }

  rank(results: RetrievalResult[]): RankedResult[] {
    const now = Date.now();

    const ranked = results.map((result): RankedResult => {
      const factors = this.computeFactors(result, now);
      const rankScore =
        factors.similarity * WEIGHTS.similarity +
        factors.recency * WEIGHTS.recency +
        factors.authority * WEIGHTS.authority +
        factors.usageFrequency * WEIGHTS.usageFrequency +
        factors.sourceTrust * WEIGHTS.sourceTrust;

      return { ...result, rankScore, factors };
    });

    ranked.sort((a, b) => b.rankScore - a.rankScore);

    // Reassign ranks
    return ranked.map((r) => ({ ...r, rankScore: r.rankScore }));
  }

  private computeFactors(result: RetrievalResult, now: number): RankingFactors {
    return {
      similarity: this.normalizeSimilarity(result.score),
      recency: this.computeRecency(result.document.createdAt, now),
      authority: this.computeAuthority(result.document.author),
      usageFrequency: this.computeUsageFrequency(result.chunk.id),
      sourceTrust: this.computeSourceTrust(result.document.source),
    };
  }

  private normalizeSimilarity(score: number): number {
    return Math.max(0, Math.min(1, score));
  }

  private computeRecency(createdAt: string, now: number): number {
    const ageMs = now - new Date(createdAt).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.min(1, 1 - ageMs / (thirtyDays * 6)));
  }

  private computeAuthority(author: string): number {
    const authority = this.authorAuthority.get(author);
    if (authority !== undefined) return authority;
    // Default: moderate authority
    return 0.5;
  }

  private computeUsageFrequency(chunkId: string): number {
    const count = this.usageCounts.get(chunkId) ?? 0;
    return Math.min(1, count / 10);
  }

  private computeSourceTrust(source: string): number {
    return SOURCE_TRUST[source] ?? 0.5;
  }

  getWeights(): typeof WEIGHTS {
    return { ...WEIGHTS };
  }
}
