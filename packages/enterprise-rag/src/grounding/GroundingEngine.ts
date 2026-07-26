import type {
  Citation,
  GroundedAnswer,
  GroundedChunk,
  RankedResult,
  IKnowledgeGraphBridge,
} from '../models.js';

export class GroundingEngine {
  private readonly kgBridge: IKnowledgeGraphBridge | null;

  constructor(kgBridge?: IKnowledgeGraphBridge) {
    this.kgBridge = kgBridge ?? null;
  }

  ground(
    query: string,
    results: RankedResult[],
    organizationId: string,
  ): GroundedAnswer {
    const groundedChunks: GroundedChunk[] = results.map((r) => ({
      chunkId: r.chunk.id,
      documentId: r.document.id,
      content: r.chunk.content,
      score: r.rankScore,
      section: r.chunk.section,
      position: r.chunk.position,
    }));

    const citations: Citation[] = results.map((r) => ({
      documentId: r.document.id,
      documentTitle: r.document.title,
      source: r.document.source,
      author: r.document.author,
      chunkId: r.chunk.id,
      section: r.chunk.section,
      position: r.chunk.position,
      score: r.rankScore,
      knowledgeGraphRefs: this.getKGReferences(r.document.id, organizationId),
    }));

    const answer = this.buildAnswer(query, results);
    const confidence = this.computeConfidence(results);

    return {
      answer,
      citations,
      groundedChunks,
      confidence,
      organizationId,
    };
  }

  private buildAnswer(query: string, results: RankedResult[]): string {
    if (results.length === 0) {
      return `No relevant information found for query: "${query}".`;
    }

    const topResult = results[0];
    const sections = new Set<string | null>();
    for (const r of results) {
      sections.add(r.chunk.section);
    }

    const sectionInfo = [...sections].filter((s) => s !== null).length > 0
      ? ` Found in sections: ${[...sections].filter((s) => s !== null).join(', ')}.`
      : '';

    return `Based on ${results.length} retrieved document(s) from ${new Set(results.map((r) => r.document.source)).size} source(s), ` +
      `the most relevant information comes from "${topResult.document.title}" ` +
      `by ${topResult.document.author} (score: ${topResult.rankScore.toFixed(3)}).${sectionInfo} ` +
      `Key content: "${topResult.chunk.content.slice(0, 200)}..."`;
  }

  private computeConfidence(results: RankedResult[]): number {
    if (results.length === 0) return 0;
    const avgScore = results.reduce((s, r) => s + r.rankScore, 0) / results.length;
    const sourceDiversity = new Set(results.map((r) => r.document.source)).size;
    const diversityBoost = Math.min(0.15, sourceDiversity * 0.05);
    return Math.min(0.98, avgScore + diversityBoost);
  }

  private getKGReferences(documentId: string, organizationId: string): string[] {
    if (!this.kgBridge) return [];
    return this.kgBridge.getRelatedEntities(documentId, organizationId);
  }

  explainCitation(citation: Citation): string {
    const sectionStr = citation.section ? `, section "${citation.section}"` : '';
    return `"${citation.documentTitle}" by ${citation.author} ` +
      `(source: ${citation.source}${sectionStr}, score: ${citation.score.toFixed(3)}, ` +
      `KG refs: ${citation.knowledgeGraphRefs.length})`;
  }

  explainAll(citations: Citation[]): string[] {
    return citations.map((c) => this.explainCitation(c));
  }
}
