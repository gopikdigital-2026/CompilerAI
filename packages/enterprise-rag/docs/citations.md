# Citations

## Citation Structure

Each citation provides full provenance for a grounded chunk, including Knowledge Graph cross-references:

```typescript
interface Citation {
  documentId: string;                        // source document ID
  documentTitle: string;                     // document title
  source: ContentSource;                     // content source
  author: string;                            // author
  chunkId: string;                           // chunk identifier
  section: string | null;                    // section name or null
  position: { start: number; end: number };  // character offsets in source
  score: number;                             // rank score
  knowledgeGraphRefs: string[];              // KG entity IDs (empty without bridge)
}
```

## Citation Formatting

The `CitationEngine` formats citations into human-readable strings:

### Single citation

```typescript
formatCitation(citation): string
```

Output format:
```
[doc-1] Project Alpha — alice (source: google_drive) § Overview pos: 0-120 score: 0.750 KG: kg-entity-1
```

### Citation list

```typescript
formatCitationList(citations): string
```

Output:
```
Citations (2):
  1. [doc-1] Project Alpha — alice (source: google_drive) § Overview pos: 0-120 score: 0.750
  2. [doc-2] Architecture Notes — bob (source: github) pos: 0-80 score: 0.620
```

When there are no citations, the output is `No citations available.`

## Bibliography Generation

The bibliography is a deduplicated list of unique source documents:

```typescript
formatBibliography(citations): string
```

Output:
```
Bibliography (2 source(s)):
1. Project Alpha — alice (google_drive)
2. Architecture Notes — bob (github)
```

Deduplication is by `documentId`, so multiple citations from the same document appear only once.

## Traceability Object

The `toTraceableObject()` method extracts a structured summary suitable for logging, auditing, or UI rendering:

```typescript
{
  documentIds: string[];  // unique document IDs
  chunkIds: string[];     // unique chunk IDs
  kgRefs: string[];       // unique Knowledge Graph entity IDs
  sources: ContentSource[]; // unique content sources
}
```

## Code Example

```typescript
import { RAGEngine, createDocument, CitationEngine } from '@compilerai/enterprise-rag';

const rag = new RAGEngine();

await rag.ingest('google_drive', [
  createDocument('google_drive', 'file-1', 'Project Alpha', 'Project Alpha uses microservices.', 'alice', 'org-1'),
  createDocument('github', 'repo-1', 'Architecture Doc', 'The system is event-driven.', 'bob', 'org-1'),
]);

const answer = await rag.explain('What is the architecture?', 'org-1');

// Format citations as a list
console.log(rag.formatCitations(answer));
// Citations (2):
//   1. [doc-1] Project Alpha — alice (source: google_drive) pos: 0-29 score: 0.750
//   2. [doc-2] Architecture Doc — bob (source: github) pos: 0-24 score: 0.620

// Format bibliography
console.log(rag.formatBibliography(answer));
// Bibliography (2 source(s)):
// 1. Project Alpha — alice (google_drive)
// 2. Architecture Doc — bob (github)

// Get traceability object
const engine = new CitationEngine();
const trace = engine.toTraceableObject(answer.citations);
console.log(trace);
// { documentIds: ['doc-1', 'doc-2'], chunkIds: ['chunk-1', 'chunk-2'], kgRefs: [], sources: ['google_drive', 'github'] }
```

### Using the CitationEngine directly

```typescript
import { CitationEngine } from '@compilerai/enterprise-rag';

const engine = new CitationEngine();
const formatted = engine.formatCitation(citation);
const bibliography = engine.formatBibliography(citations);
const docIds = engine.getDocumentIds(citations);
const kgRefs = engine.getKGReferences(citations);
```
