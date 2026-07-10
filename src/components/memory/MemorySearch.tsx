import React from 'react';
import { Search, X, Loader2, Database, FileText, GitBranch } from 'lucide-react';
import type { MemorySearchResult } from '../../types/memory';

const TYPE_LABELS: Record<string, string> = {
  short_term:     'Memoria Corta',
  long_term:      'Memoria Larga',
  organizational: 'Memoria Org.',
};

const EXAMPLE_QUERIES = [
  'Workflows relacionados con facturación',
  'Errores del PDF Agent',
  'Clientes con pedidos recurrentes',
  'Políticas de reintentos',
  'Patrones detectados esta semana',
];

interface MemorySearchProps {
  query: string;
  results: MemorySearchResult[];
  isSearching: boolean;
  showResults: boolean;
  onSearch: (q: string) => void;
  onClear: () => void;
}

export function MemorySearch({
  query, results, isSearching, showResults, onSearch, onClear,
}: MemorySearchProps) {
  return (
    <div className="relative w-full max-w-2xl">
      {/* Input */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-neutral-500">
          {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Busca en memoria por lenguaje natural… ej: 'workflows de facturación'"
          className="w-full pl-9 pr-10 py-2.5 bg-surface-800 border border-surface-600 rounded-xl text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 transition-all"
        />
        {query && (
          <button onClick={onClear} className="absolute right-3 text-neutral-500 hover:text-neutral-300 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Example queries (when empty) */}
      {!query && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[10px] text-neutral-700">Prueba:</span>
          {EXAMPLE_QUERIES.slice(0, 3).map(q => (
            <button
              key={q}
              onClick={() => onSearch(q)}
              className="text-[10px] text-neutral-600 hover:text-neutral-400 px-2 py-0.5 bg-surface-800 border border-surface-700 rounded-full hover:border-surface-500 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Results dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-800 border border-surface-600 rounded-xl shadow-2xl z-50 overflow-hidden">
          {isSearching ? (
            <div className="flex items-center gap-3 px-4 py-4">
              <Loader2 size={14} className="animate-spin text-brand-400" />
              <div>
                <p className="text-xs text-neutral-300">Buscando en memoria cognitiva…</p>
                <p className="text-[10px] text-neutral-600 mt-0.5">Analizando embeddings y patrones semánticos</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-xs text-neutral-500">
              Sin resultados para "{query}"
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-surface-700 flex items-center gap-2">
                <Database size={11} className="text-brand-400" />
                <span className="text-[10px] text-neutral-500">{results.length} resultado{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-surface-700">
                {results.map(r => (
                  <div key={r.entry.id} className="px-3 py-2.5 hover:bg-surface-750 transition-colors group">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-neutral-600 bg-surface-700 border border-surface-600 px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                        {TYPE_LABELS[r.entry.memoryType] ?? r.entry.memoryType}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-200">{r.entry.title}</p>
                        <p className="text-[10px] text-neutral-600 mt-0.5 line-clamp-1">{r.highlight}</p>
                      </div>
                      <span className="text-[10px] text-brand-400 font-mono flex-shrink-0">
                        {Math.round(r.matchScore * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
