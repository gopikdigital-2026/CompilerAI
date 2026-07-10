// ─── Memory type discriminators ───────────────────────────────────────────────

export type MemoryType = 'short_term' | 'long_term' | 'organizational' | 'semantic';

// Short-term event types
export type ShortTermEventType = 'event' | 'action' | 'error' | 'decision';
export type SeverityLevel      = 'low' | 'medium' | 'high';

// Long-term categories
export type LongTermCategory =
  | 'client_profile'
  | 'prompt_template'
  | 'workflow_favorite'
  | 'agent_performance'
  | 'pattern';

// Organizational categories
export type OrgCategory =
  | 'process'
  | 'policy'
  | 'documentation'
  | 'integration'
  | 'norm';

// Semantic / graph node types
export type GraphNodeType =
  | 'hub'
  | 'agent'
  | 'client'
  | 'workflow'
  | 'document'
  | 'process';

// ─── Knowledge graph primitives (future: generated from vector similarity) ────

export interface MemoryRelation {
  targetId:         string;
  targetType:       GraphNodeType;
  relationshipType: string;   // e.g. 'uses', 'creates', 'triggers', 'involves'
  weight:           number;   // 0-1 edge strength
}

// ─── Core memory entry (maps 1:1 to the DB row) ───────────────────────────────

export interface MemoryEntry {
  id:             string;
  organizationId: string;
  userId?:        string;
  memoryType:     MemoryType;
  category:       string;
  title:          string;
  content:        string;
  metadata:       Record<string, unknown>;
  tags:           string[];

  // ── RAG / Vector DB fields (prepared, not used yet) ──────────────────────
  embeddingModel?: string;   // e.g. 'text-embedding-3-small'
  chunkIndex?:     number;   // for multi-chunk documents
  sourceRef?:      string;   // URL or file path for RAG retrieval

  // ── Knowledge graph fields (prepared) ────────────────────────────────────
  entityType?: GraphNodeType;
  entityId?:   string;
  relations:   MemoryRelation[];

  // ── Scoring ───────────────────────────────────────────────────────────────
  confidence:      number;   // 0-1
  relevanceScore?: number;   // set at query time by semantic search
  usedCount:       number;

  // ── Timing ───────────────────────────────────────────────────────────────
  learnedAt:      string;   // ISO
  lastAccessedAt: string;
  expiresAt?:     string;   // null = permanent
}

// ─── Short-term specific ──────────────────────────────────────────────────────

export interface ShortTermEntry extends MemoryEntry {
  memoryType:  'short_term';
  category:    ShortTermEventType;
  agentName?:  string;
  stepName?:   string;
  runId?:      string;
  severity:    SeverityLevel;
}

// ─── Long-term specific ───────────────────────────────────────────────────────

export interface LongTermEntry extends MemoryEntry {
  memoryType: 'long_term';
  category:   LongTermCategory;
}

// ─── Organizational specific ──────────────────────────────────────────────────

export interface OrgEntry extends MemoryEntry {
  memoryType: 'organizational';
  category:   OrgCategory;
  author:     string;
}

// ─── Semantic graph structures ────────────────────────────────────────────────

export interface GraphNode {
  id:      string;
  label:   string;
  type:    GraphNodeType;
  x:       number;
  y:       number;
  size:    number;   // radius in SVG units
  weight:  number;   // usage frequency (affects glow intensity)
  model?:  string;   // for agent nodes
}

export interface GraphEdge {
  id:      string;
  source:  string;
  target:  string;
  label:   string;
  weight:  number;   // 0-1 (affects opacity/thickness)
  type:    string;   // relationship type
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export type InsightType = 'performance' | 'cost' | 'pattern' | 'warning' | 'discovery';

export interface MemoryInsight {
  id:      string;
  type:    InsightType;
  icon:    string;   // lucide icon name
  title:   string;
  metric:  string;
  trend:   'up' | 'down' | 'neutral';
  detail?: string;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface MemorySearchResult {
  entry:          MemoryEntry;
  matchScore:     number;   // 0-1 keyword relevance
  matchedFields:  string[];
  highlight?:     string;   // excerpt with the match
}

// ─── Vector DB provider interface (future integration) ───────────────────────

export interface VectorProvider {
  name:        string;
  dimension:   number;
  embed(text: string): Promise<number[]>;
  search(query: number[], topK: number): Promise<Array<{ id: string; score: number }>>;
}

// ─── Knowledge graph provider interface (future) ─────────────────────────────

export interface KnowledgeGraphProvider {
  name: string;
  addNode(node: Partial<GraphNode>): Promise<void>;
  addEdge(edge: Partial<GraphEdge>): Promise<void>;
  traverse(startNodeId: string, depth: number): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
}
