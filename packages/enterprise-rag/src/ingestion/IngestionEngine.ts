import type { ContentSource, IngestedDocument, DocumentPermissions } from '../models.js';

let docCounter = 0;

export function computeHash(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = ((h << 5) - h + content.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(h).toString(16)}`;
}

export function createDocument(
  source: ContentSource,
  sourceId: string,
  title: string,
  content: string,
  author: string,
  organizationId: string,
  permissions?: Partial<DocumentPermissions>,
  metadata?: Record<string, unknown>,
): IngestedDocument {
  const now = new Date().toISOString();
  return {
    id: `doc-${++docCounter}`,
    source,
    sourceId,
    title,
    content,
    author,
    organizationId,
    createdAt: now,
    ingestedAt: now,
    permissions: {
      visibility: permissions?.visibility ?? 'organization',
      allowedUserIds: permissions?.allowedUserIds ?? [],
      allowedRoleIds: permissions?.allowedRoleIds ?? [],
    },
    version: '1',
    hash: computeHash(content),
    metadata: metadata ?? {},
  };
}

export interface IngestionSourceAdapter {
  source: ContentSource;
  fetch(since?: string): IngestedDocument[];
}

export class GoogleDriveAdapter implements IngestionSourceAdapter {
  readonly source: ContentSource = 'google_drive';
  private readonly docs: IngestedDocument[] = [];

  addDocument(doc: IngestedDocument): void {
    this.docs.push(doc);
  }

  fetch(since?: string): IngestedDocument[] {
    if (!since) return [...this.docs];
    return this.docs.filter((d) => d.ingestedAt >= since);
  }
}

export class GmailAdapter implements IngestionSourceAdapter {
  readonly source: ContentSource = 'gmail';
  private readonly docs: IngestedDocument[] = [];

  addDocument(doc: IngestedDocument): void {
    this.docs.push(doc);
  }

  fetch(since?: string): IngestedDocument[] {
    if (!since) return [...this.docs];
    return this.docs.filter((d) => d.ingestedAt >= since);
  }
}

export class GitHubAdapter implements IngestionSourceAdapter {
  readonly source: ContentSource = 'github';
  private readonly docs: IngestedDocument[] = [];

  addDocument(doc: IngestedDocument): void {
    this.docs.push(doc);
  }

  fetch(since?: string): IngestedDocument[] {
    if (!since) return [...this.docs];
    return this.docs.filter((d) => d.ingestedAt >= since);
  }
}

export class KnowledgeGraphAdapter implements IngestionSourceAdapter {
  readonly source: ContentSource = 'knowledge_graph';
  private readonly docs: IngestedDocument[] = [];

  addDocument(doc: IngestedDocument): void {
    this.docs.push(doc);
  }

  fetch(since?: string): IngestedDocument[] {
    if (!since) return [...this.docs];
    return this.docs.filter((d) => d.ingestedAt >= since);
  }
}

export class IngestionEngine {
  private readonly adapters = new Map<ContentSource, IngestionSourceAdapter>();
  private readonly documents = new Map<string, IngestedDocument>();
  private readonly orgDocuments = new Map<string, Set<string>>();

  registerAdapter(adapter: IngestionSourceAdapter): void {
    this.adapters.set(adapter.source, adapter);
  }

  ingest(documents: IngestedDocument[]): { added: number; updated: number; errors: string[] } {
    let added = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const doc of documents) {
      try {
        const existing = this.documents.get(doc.id);
        if (existing) {
          if (existing.hash !== doc.hash) {
            this.documents.set(doc.id, doc);
            updated++;
          }
        } else {
          this.documents.set(doc.id, doc);
          added++;
        }

        if (!this.orgDocuments.has(doc.organizationId)) {
          this.orgDocuments.set(doc.organizationId, new Set());
        }
        this.orgDocuments.get(doc.organizationId)!.add(doc.id);
      } catch (err) {
        errors.push(`Document '${doc.id}': ${(err as Error).message}`);
      }
    }

    return { added, updated, errors };
  }

  ingestFromSource(source: ContentSource, since?: string): IngestedDocument[] {
    const adapter = this.adapters.get(source);
    if (!adapter) return [];
    const docs = adapter.fetch(since);
    this.ingest(docs);
    return docs;
  }

  getDocument(id: string): IngestedDocument | undefined {
    return this.documents.get(id);
  }

  getAllDocuments(): IngestedDocument[] {
    return Array.from(this.documents.values());
  }

  getDocumentsByOrganization(orgId: string): IngestedDocument[] {
    const ids = this.orgDocuments.get(orgId) ?? new Set();
    return Array.from(ids).map((id) => this.documents.get(id)).filter((d): d is IngestedDocument => d !== undefined);
  }

  getDocumentsBySource(source: ContentSource): IngestedDocument[] {
    return Array.from(this.documents.values()).filter((d) => d.source === source);
  }

  removeDocument(id: string): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;
    this.documents.delete(id);
    this.orgDocuments.get(doc.organizationId)?.delete(id);
    return true;
  }

  count(): number {
    return this.documents.size;
  }

  hasDocument(id: string): boolean {
    return this.documents.has(id);
  }
}
