import type { EmbeddingVector, IEmbeddingProvider, IVectorStore, VectorSearchFilter, VectorSearchResult } from '../models.js';

export class InMemoryEmbeddingProvider implements IEmbeddingProvider {
  private readonly dims: number;

  constructor(dimensions: number = 128) {
    this.dims = dimensions;
  }

  async embed(text: string): Promise<number[]> {
    return this.hashEmbed(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.hashEmbed(t));
  }

  dimensions(): number {
    return this.dims;
  }

  private hashEmbed(text: string): number[] {
    const vector = new Array(this.dims).fill(0);
    const tokens = text.toLowerCase().split(/\s+/).filter((t) => t.length > 0);

    for (const token of tokens) {
      let h = 0;
      for (let i = 0; i < token.length; i++) {
        h = ((h << 5) - h + token.charCodeAt(i)) | 0;
      }
      const idx = Math.abs(h) % this.dims;
      vector[idx] += 1;

      // Second hash for better distribution
      let h2 = 0;
      for (let i = 0; i < token.length; i++) {
        h2 = ((h2 << 7) - h2 + token.charCodeAt(i) * 31) | 0;
      }
      const idx2 = Math.abs(h2) % this.dims;
      vector[idx2] += 0.5;
    }

    // Normalize
    const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }
}

export class InMemoryVectorStore implements IVectorStore {
  private readonly embeddings = new Map<string, EmbeddingVector>();
  private readonly docIndex = new Map<string, Set<string>>();

  add(embedding: EmbeddingVector): void {
    this.embeddings.set(embedding.id, embedding);
    if (!this.docIndex.has(embedding.documentId)) {
      this.docIndex.set(embedding.documentId, new Set());
    }
    this.docIndex.get(embedding.documentId)!.add(embedding.id);
  }

  addBatch(embeddings: EmbeddingVector[]): void {
    for (const e of embeddings) this.add(e);
  }

  remove(id: string): void {
    const emb = this.embeddings.get(id);
    if (emb) {
      this.docIndex.get(emb.documentId)?.delete(id);
      this.embeddings.delete(id);
    }
  }

  removeByDocument(documentId: string): void {
    const ids = this.docIndex.get(documentId);
    if (ids) {
      for (const id of ids) {
        this.embeddings.delete(id);
      }
      this.docIndex.delete(documentId);
    }
  }

  search(queryVector: number[], limit: number, filter?: VectorSearchFilter): VectorSearchResult[] {
    let candidates = Array.from(this.embeddings.values());

    if (filter?.organizationId) {
      candidates = candidates.filter((e) => e.organizationId === filter.organizationId);
    }
    if (filter?.documentIds && filter.documentIds.length > 0) {
      const docSet = new Set(filter.documentIds);
      candidates = candidates.filter((e) => docSet.has(e.documentId));
    }

    const results: VectorSearchResult[] = candidates.map((embedding) => ({
      embedding,
      score: this.cosineSimilarity(queryVector, embedding.vector),
    }));

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  count(): number {
    return this.embeddings.size;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
