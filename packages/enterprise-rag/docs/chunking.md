# Chunking

## Strategies

The `ChunkingEngine` supports three chunking strategies, selectable via the `ChunkingConfig`:

| Strategy | Identifier | Behavior |
|----------|------------|----------|
| Fixed size | `fixed_size` | Sliding window of `chunkSize` characters with `overlap` between consecutive chunks |
| By header | `by_header` | Splits on Markdown `#`-`######` headers and all-caps title lines |
| By section | `by_section` | Splits on `---`, `***`, or 3+ blank-line separators; oversized sections are sub-chunked |

## Configuration

```typescript
interface ChunkingConfig {
  strategy: ChunkStrategy;       // 'fixed_size' | 'by_header' | 'by_section'
  chunkSize: number;             // target chunk size in characters
  overlap: number;               // character overlap between adjacent chunks
  preserveTables: boolean;       // keep markdown tables intact
  preserveCodeBlocks: boolean;   // keep ``` code fences intact
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `strategy` | `fixed_size` | Chunking strategy to apply |
| `chunkSize` | `512` | Target chunk size in characters |
| `overlap` | `64` | Overlap in characters between adjacent chunks |
| `preserveTables` | `true` | Extend chunk boundaries to include full markdown tables |
| `preserveCodeBlocks` | `true` | Extend chunk boundaries to include full fenced code blocks |

## Table and Code Block Preservation

When `preserveTables` or `preserveCodeBlocks` is enabled, the engine detects protected segments before chunking:

- **Code blocks** — fenced regions between ` ``` ` markers are never split across chunks.
- **Tables** — pipe-delimited markdown table regions are kept intact.

If a chunk boundary falls inside a protected segment, the chunk is extended to the segment's end before the overlap window advances.

## Chunk Structure

Each chunk captures its position within the source document for traceability:

```typescript
interface Chunk {
  id: string;                              // unique chunk ID (chunk-<N>)
  documentId: string;                      // parent document ID
  index: number;                           // ordinal position within the document
  content: string;                         // chunk text
  tokenCount: number;                      // estimated tokens (ceil(length / 4))
  section: string | null;                  // section name or null
  position: { start: number; end: number }; // character offsets in source content
  hash: string;                            // content hash for dedup
}
```

## Code Example

```typescript
import { RAGEngine, createDocument } from '@compilerai/enterprise-rag';

// Configure chunking at construction time
const rag = new RAGEngine({
  chunkingConfig: {
    strategy: 'by_section',
    chunkSize: 256,
    overlap: 32,
    preserveTables: true,
    preserveCodeBlocks: true,
  },
});

const doc = createDocument(
  'google_drive',
  'file-1',
  'Architecture Guide',
  '# Overview\n\nThe system uses microservices.\n\n---\n\n# Details\n\n```yaml\nservice: api\n```',
  'alice',
  'org-1',
);

await rag.ingest('google_drive', [doc]);

console.log(rag.countChunks());
// 2 — one per section, code block preserved
```

### Using the ChunkingEngine directly

```typescript
import { ChunkingEngine, createDocument } from '@compilerai/enterprise-rag';

const engine = new ChunkingEngine({ strategy: 'by_header', chunkSize: 200, overlap: 0 });
const doc = createDocument('github', 'readme', 'README', '# Intro\nText\n# Usage\nMore text', 'bob', 'org-1');

const chunks = engine.chunk(doc);
// [
//   { id: 'chunk-1', index: 0, section: 'Intro',     content: '# Intro\nText',  ... },
//   { id: 'chunk-2', index: 1, section: 'Usage',     content: '# Usage\nMore text', ... },
// ]
```
