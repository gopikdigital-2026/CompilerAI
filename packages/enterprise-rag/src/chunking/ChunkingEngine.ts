import type { Chunk, ChunkingConfig, IngestedDocument } from '../models.js';

let chunkCounter = 0;

export class ChunkingEngine {
  private readonly config: ChunkingConfig;

  constructor(config?: Partial<ChunkingConfig>) {
    this.config = {
      strategy: config?.strategy ?? 'fixed_size',
      chunkSize: config?.chunkSize ?? 512,
      overlap: config?.overlap ?? 64,
      preserveTables: config?.preserveTables ?? true,
      preserveCodeBlocks: config?.preserveCodeBlocks ?? true,
    };
  }

  chunk(document: IngestedDocument): Chunk[] {
    switch (this.config.strategy) {
      case 'by_header':
        return this.chunkByHeader(document);
      case 'by_section':
        return this.chunkBySection(document);
      default:
        return this.chunkFixedSize(document);
    }
  }

  private chunkFixedSize(document: IngestedDocument): Chunk[] {
    const content = document.content;
    const chunks: Chunk[] = [];
    const size = this.config.chunkSize;
    const overlap = this.config.overlap;

    const segments = this.extractProtectedSegments(content);
    let pos = 0;
    let index = 0;

    while (pos < content.length) {
      const end = Math.min(pos + size, content.length);
      const chunkContent = content.slice(pos, end);

      // Check if this chunk overlaps with a protected segment
      const protectedSegment = segments.find((s) => pos >= s.start && pos < s.end);
      if (protectedSegment && protectedSegment.end > end) {
        // Extend to include the full protected segment
        const fullContent = content.slice(pos, Math.min(protectedSegment.end, content.length));
        chunks.push(this.createChunk(document, index, fullContent, pos, Math.min(protectedSegment.end, content.length), null));
        pos = protectedSegment.end - overlap;
        index++;
        continue;
      }

      chunks.push(this.createChunk(document, index, chunkContent, pos, end, null));
      pos = end - overlap > pos ? end - overlap : end;
      index++;
    }

    return chunks;
  }

  private chunkByHeader(document: IngestedDocument): Chunk[] {
    const content = document.content;
    const lines = content.split('\n');
    const chunks: Chunk[] = [];
    let currentSection = '';
    let currentContent: string[] = [];
    let startPos = 0;
    let index = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^#{1,6}\s+(.+)/);
      const isHeader = !!headerMatch || /^[A-Z][A-Z\s]{5,}$/.test(line.trim());

      if (isHeader && currentContent.length > 0) {
        const chunkContent = currentContent.join('\n');
        chunks.push(this.createChunk(document, index, chunkContent, startPos, startPos + chunkContent.length, currentSection));
        index++;
        currentContent = [];
        startPos = i;
        currentSection = headerMatch ? headerMatch[1].trim() : line.trim();
      } else if (isHeader) {
        currentSection = headerMatch ? headerMatch[1].trim() : line.trim();
      }

      currentContent.push(line);
    }

    if (currentContent.length > 0) {
      const chunkContent = currentContent.join('\n');
      chunks.push(this.createChunk(document, index, chunkContent, startPos, startPos + chunkContent.length, currentSection));
    }

    return chunks.length > 0 ? chunks : this.chunkFixedSize(document);
  }

  private chunkBySection(document: IngestedDocument): Chunk[] {
    const content = document.content;
    const sectionMarker = /\n---\n|\n\*\*\*\n|\n{3,}/;
    const sections = content.split(sectionMarker);
    const chunks: Chunk[] = [];
    let pos = 0;
    let index = 0;

    for (const section of sections) {
      const trimmed = section.trim();
      if (trimmed.length === 0) continue;

      // If section is larger than chunk size, sub-chunk it
      if (trimmed.length > this.config.chunkSize) {
        const subDoc = { ...document, content: trimmed };
        const subChunks = this.chunkFixedSize(subDoc);
        for (const sub of subChunks) {
          chunks.push({
            ...sub,
            id: `chunk-${++chunkCounter}`,
            index,
            section: `Section ${index + 1}`,
            position: { start: pos + sub.position.start, end: pos + sub.position.end },
          });
        }
      } else {
        chunks.push(this.createChunk(document, index, trimmed, pos, pos + trimmed.length, `Section ${index + 1}`));
      }

      pos += section.length + 4;
      index++;
    }

    return chunks.length > 0 ? chunks : this.chunkFixedSize(document);
  }

  private createChunk(
    document: IngestedDocument,
    index: number,
    content: string,
    start: number,
    end: number,
    section: string | null,
  ): Chunk {
    return {
      id: `chunk-${++chunkCounter}`,
      documentId: document.id,
      index,
      content,
      tokenCount: this.estimateTokens(content),
      section,
      position: { start, end },
      hash: this.hash(content),
    };
  }

  private extractProtectedSegments(content: string): { start: number; end: number; type: string }[] {
    const segments: { start: number; end: number; type: string }[] = [];

    if (this.config.preserveCodeBlocks) {
      const codeBlockRegex = /```[\s\S]*?```/g;
      let match;
      while ((match = codeBlockRegex.exec(content)) !== null) {
        segments.push({ start: match.index, end: match.index + match[0].length, type: 'code' });
      }
    }

    if (this.config.preserveTables) {
      const tableRegex = /\|.*\|[\s\S]*?(?=\n\n|\n#|\n$|$)/g;
      let match;
      while ((match = tableRegex.exec(content)) !== null) {
        segments.push({ start: match.index, end: match.index + match[0].length, type: 'table' });
      }
    }

    return segments;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private hash(text: string): string {
    let h = 0;
    for (let i = 0; i < text.length; i++) {
      h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    }
    return `h${Math.abs(h).toString(16)}`;
  }

  getConfig(): ChunkingConfig {
    return { ...this.config };
  }
}
