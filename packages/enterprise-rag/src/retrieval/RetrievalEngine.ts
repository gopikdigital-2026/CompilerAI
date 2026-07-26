import type {
  Chunk,
  IngestedDocument,
  RetrievalQuery,
  RetrievalResult,
  IEmbeddingProvider,
  IVectorStore,
  VectorSearchFilter,
} from '../models.js';

export class RetrievalEngine {
  private readonly embeddingProvider: IEmbeddingProvider;
  private readonly vectorStore: IVectorStore;
  private readonly chunks = new Map<string, Chunk>();
  private readonly documents = new Map<string, IngestedDocument>();
  private readonly chunkIndexByDoc = new Map<string, string[]>();
  private readonly usageTracker = new Map<string, number>();

  constructor(embeddingProvider: IEmbeddingProvider, vectorStore: IVectorStore) {
    this.embeddingProvider = embeddingProvider;
    this.vectorStore = vectorStore;
  }

  indexChunks(document: IngestedDocument, chunks: Chunk[], embeddings: { chunkId: string; vector: number[] }[]): void {
    this.documents.set(document.id, document);
    this.chunkIndexByDoc.set(document.id, chunks.map((c) => c.id));
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
    }
    for (const emb of embeddings) {
      this.vectorStore.add({
        id: `emb-${emb.chunkId}`,
        chunkId: emb.chunkId,
        vector: emb.vector,
        documentId: document.id,
        organizationId: document.organizationId,
      });
    }
  }

  removeDocument(documentId: string): void {
    const chunkIds = this.chunkIndexByDoc.get(documentId) ?? [];
    for (const cid of chunkIds) {
      this.chunks.delete(cid);
    }
    this.chunkIndexByDoc.delete(documentId);
    this.documents.delete(documentId);
    this.vectorStore.removeByDocument(documentId);
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult[]> {
    if (query.mode === 'metadata') {
      return this.retrieveByMetadata(query);
    }

    if (query.mode === 'vector') {
      return this.retrieveByVector(query);
    }

    return this.retrieveHybrid(query);
  }

  private async retrieveByVector(query: RetrievalQuery): Promise<RetrievalResult[]> {
    const queryVector = await this.embeddingProvider.embed(query.query);
    const filter = this.buildFilter(query);
    const limit = query.limit ?? 10;
    const vectorResults = this.vectorStore.search(queryVector, limit * 2, filter);

    const results: RetrievalResult[] = [];
    for (const vr of vectorResults) {
      const chunk = this.chunks.get(vr.embedding.chunkId);
      const document = this.documents.get(vr.embedding.documentId);
      if (!chunk || !document) continue;
      if (!this.checkPermissions(document, query)) continue;
      if (!this.checkDateRange(document, query)) continue;

      this.trackUsage(chunk.id);
      results.push({
        chunk,
        document,
        score: vr.score,
        matchedFields: ['vector'],
      });
    }

    return results.slice(0, limit);
  }

  private retrieveByMetadata(query: RetrievalQuery): Promise<RetrievalResult[]> {
    const limit = query.limit ?? 10;
    const text = query.query.toLowerCase();
    const tokens = text.split(/\s+/).filter((t) => t.length > 0);

    const candidates = this.getAccessibleDocuments(query);

    const results: RetrievalResult[] = [];
    for (const doc of candidates) {
      const docChunks = (this.chunkIndexByDoc.get(doc.id) ?? [])
        .map((cid) => this.chunks.get(cid))
        .filter((c): c is Chunk => c !== undefined);

      for (const chunk of docChunks) {
        const score = this.metadataScore(chunk, doc, tokens);
        if (score > 0) {
          this.trackUsage(chunk.id);
          results.push({
            chunk,
            document: doc,
            score,
            matchedFields: this.getMatchedFields(chunk, doc, tokens),
          });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    return Promise.resolve(results.slice(0, limit));
  }

  private async retrieveHybrid(query: RetrievalQuery): Promise<RetrievalResult[]> {
    const limit = query.limit ?? 10;
    const [vectorResults, metadataResults] = await Promise.all([
      this.retrieveByVector({ ...query, limit: limit * 2 }),
      this.retrieveByMetadata({ ...query, limit: limit * 2 }),
    ]);

    const merged = new Map<string, RetrievalResult>();

    for (const r of vectorResults) {
      const existing = merged.get(r.chunk.id);
      if (existing) {
        existing.score = Math.max(existing.score, r.score) * 1.1;
        existing.matchedFields = [...new Set([...existing.matchedFields, ...r.matchedFields])];
      } else {
        merged.set(r.chunk.id, { ...r, score: r.score * 0.7 });
      }
    }

    for (const r of metadataResults) {
      const existing = merged.get(r.chunk.id);
      if (existing) {
        existing.score = Math.max(existing.score, r.score) * 1.1;
        existing.matchedFields = [...new Set([...existing.matchedFields, ...r.matchedFields])];
      } else {
        merged.set(r.chunk.id, { ...r, score: r.score * 0.5 });
      }
    }

    const results = Array.from(merged.values());
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  private buildFilter(query: RetrievalQuery): VectorSearchFilter {
    const filter: VectorSearchFilter = { organizationId: query.organizationId };
    if (query.source) filter.source = query.source;
    return filter;
  }

  private getAccessibleDocuments(query: RetrievalQuery): IngestedDocument[] {
    return Array.from(this.documents.values()).filter((doc) => {
      if (doc.organizationId !== query.organizationId) return false;
      if (query.source && doc.source !== query.source) return false;
      return this.checkPermissions(doc, query);
    });
  }

  private checkPermissions(doc: IngestedDocument, query: RetrievalQuery): boolean {
    const perms = doc.permissions;
    if (perms.visibility === 'public') return true;
    if (perms.visibility === 'organization') return doc.organizationId === query.organizationId;
    if (perms.visibility === 'private') {
      return query.userId !== undefined && perms.allowedUserIds.includes(query.userId);
    }
    if (perms.visibility === 'restricted') {
      if (query.userId && perms.allowedUserIds.includes(query.userId)) return true;
      if (query.roleIds && query.roleIds.some((r) => perms.allowedRoleIds.includes(r))) return true;
      return false;
    }
    return false;
  }

  private checkDateRange(doc: IngestedDocument, query: RetrievalQuery): boolean {
    if (!query.dateRange) return true;
    const docDate = doc.createdAt;
    return docDate >= query.dateRange.start && docDate <= query.dateRange.end;
  }

  private metadataScore(chunk: Chunk, _doc: IngestedDocument, tokens: string[]): number {
    const content = chunk.content.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (content.includes(token)) score += 1;
    }
    return score / Math.max(1, tokens.length);
  }

  private getMatchedFields(chunk: Chunk, doc: IngestedDocument, tokens: string[]): string[] {
    const fields: string[] = [];
    const content = chunk.content.toLowerCase();
    if (tokens.some((t) => content.includes(t))) fields.push('content');
    if (tokens.some((t) => doc.title.toLowerCase().includes(t))) fields.push('title');
    if (chunk.section && tokens.some((t) => chunk.section!.toLowerCase().includes(t))) fields.push('section');
    return fields.length > 0 ? fields : ['metadata'];
  }

  private trackUsage(chunkId: string): void {
    this.usageTracker.set(chunkId, (this.usageTracker.get(chunkId) ?? 0) + 1);
  }

  getUsageCount(chunkId: string): number {
    return this.usageTracker.get(chunkId) ?? 0;
  }

  getChunk(id: string): Chunk | undefined {
    return this.chunks.get(id);
  }

  getDocument(id: string): IngestedDocument | undefined {
    return this.documents.get(id);
  }

  countChunks(): number {
    return this.chunks.size;
  }

  countDocuments(): number {
    return this.documents.size;
  }
}
