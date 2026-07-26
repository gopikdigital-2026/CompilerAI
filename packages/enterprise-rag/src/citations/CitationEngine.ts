import type { Citation } from '../models.js';

export class CitationEngine {
  formatCitations(citations: Citation[]): string[] {
    return citations.map((c) => this.formatCitation(c));
  }

  formatCitation(citation: Citation): string {
    const parts: string[] = [
      `[${citation.documentId}]`,
      citation.documentTitle,
      `— ${citation.author}`,
      `(source: ${citation.source})`,
    ];

    if (citation.section) {
      parts.push(`§ ${citation.section}`);
    }

    if (citation.position.start !== citation.position.end) {
      parts.push(`pos: ${citation.position.start}-${citation.position.end}`);
    }

    parts.push(`score: ${citation.score.toFixed(3)}`);

    if (citation.knowledgeGraphRefs.length > 0) {
      parts.push(`KG: ${citation.knowledgeGraphRefs.join(', ')}`);
    }

    return parts.join(' ');
  }

  formatCitationList(citations: Citation[]): string {
    if (citations.length === 0) return 'No citations available.';
    const lines = this.formatCitations(citations);
    return `Citations (${citations.length}):\n${lines.map((l, i) => `  ${i + 1}. ${l}`).join('\n')}`;
  }

  formatBibliography(citations: Citation[]): string {
    const seen = new Set<string>();
    const unique: Citation[] = [];
    for (const c of citations) {
      if (!seen.has(c.documentId)) {
        seen.add(c.documentId);
        unique.push(c);
      }
    }

    const lines = unique.map((c, i) =>
      `${i + 1}. ${c.documentTitle} — ${c.author} (${c.source})`,
    );

    return `Bibliography (${unique.length} source(s)):\n${lines.join('\n')}`;
  }

  getDocumentIds(citations: Citation[]): string[] {
    return [...new Set(citations.map((c) => c.documentId))];
  }

  getKGReferences(citations: Citation[]): string[] {
    return [...new Set(citations.flatMap((c) => c.knowledgeGraphRefs))];
  }

  toTraceableObject(citations: Citation[]): {
    documentIds: string[];
    chunkIds: string[];
    kgRefs: string[];
    sources: string[];
  } {
    return {
      documentIds: this.getDocumentIds(citations),
      chunkIds: [...new Set(citations.map((c) => c.chunkId))],
      kgRefs: this.getKGReferences(citations),
      sources: [...new Set(citations.map((c) => c.source))],
    };
  }
}
