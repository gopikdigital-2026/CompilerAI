import { useCallback, useState } from 'react';
import type { MemoryEntry, MemorySearchResult } from '../types/memory';
import {
  MOCK_SHORT_TERM, MOCK_LONG_TERM, MOCK_ORG_MEMORY,
  NL_SEARCH_PATTERNS,
} from '../lib/memoryMocks';

// Merge all searchable entries
const ALL_ENTRIES: MemoryEntry[] = [
  ...MOCK_SHORT_TERM,
  ...MOCK_LONG_TERM,
  ...MOCK_ORG_MEMORY,
];

// ─── NL search logic ──────────────────────────────────────────────────────────

function computeMatchScore(entry: MemoryEntry, query: string): number {
  const text = `${entry.title} ${entry.content} ${entry.category} ${entry.tags.join(' ')}`.toLowerCase();
  const q    = query.toLowerCase();

  // Collect candidate keywords from NL patterns
  const keywords: string[] = [];
  for (const [pattern, kws] of NL_SEARCH_PATTERNS) {
    if (pattern.test(query)) keywords.push(...kws);
  }

  // Exact substring if no pattern matched
  if (keywords.length === 0) {
    return text.includes(q) ? 0.6 + (q.length / 100) : 0;
  }

  const hits = keywords.filter((kw) => text.includes(kw.toLowerCase()));
  return hits.length / keywords.length;
}

function excerptFor(entry: MemoryEntry, query: string): string {
  const q = query.toLowerCase();
  const content = entry.content;
  const idx = content.toLowerCase().indexOf(q);
  if (idx === -1) return content.slice(0, 80) + '…';
  const start = Math.max(0, idx - 30);
  const end   = Math.min(content.length, idx + q.length + 50);
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
}

function searchEntries(query: string): MemorySearchResult[] {
  if (!query.trim()) return [];
  return ALL_ENTRIES
    .map((entry): MemorySearchResult => ({
      entry,
      matchScore:    computeMatchScore(entry, query),
      matchedFields: ['title', 'content'],
      highlight:     excerptFor(entry, query),
    }))
    .filter((r) => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 15);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMemory() {
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<MemorySearchResult[]>([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [showResults, setShowResults]   = useState(false);

  const search = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    setShowResults(true);
    // Simulate neural search latency
    setTimeout(() => {
      setSearchResults(searchEntries(query));
      setIsSearching(false);
    }, 750);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  }, []);

  // Accessors for each memory type (already imported from mocks)
  const shortTermEntries = MOCK_SHORT_TERM;
  const longTermEntries  = MOCK_LONG_TERM;
  const orgEntries       = MOCK_ORG_MEMORY;

  return {
    shortTermEntries,
    longTermEntries,
    orgEntries,
    searchQuery,
    searchResults,
    isSearching,
    showResults,
    search,
    clearSearch,
  };
}
