import { X, GitBranch, Clock, User } from 'lucide-react';
import type { WorkflowVersion } from '../../types/workflow';

interface VersionHistoryProps {
  versions: WorkflowVersion[];
  onClose:  () => void;
}

export function VersionHistory({ versions, onClose }: VersionHistoryProps) {
  return (
    <div className="absolute top-0 right-0 bottom-0 w-72 bg-surface-900 border-l border-surface-800 shadow-2xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-blue-400" />
          <span className="text-sm font-semibold text-neutral-200">Historial</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:text-neutral-300 rounded hover:bg-surface-700 transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto py-2">
        {versions.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-neutral-600">Sin versiones guardadas</p>
          </div>
        )}
        {versions.map((v, i) => (
          <div key={v.id} className="relative flex gap-3 px-4 py-3 hover:bg-surface-800 transition-colors group">
            {/* Timeline line */}
            {i < versions.length - 1 && (
              <div className="absolute left-[27px] top-8 w-px h-full bg-surface-700" />
            )}
            {/* Dot */}
            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 z-10 ${
              i === 0 ? 'bg-blue-600 border-2 border-blue-400' : 'bg-surface-700 border border-surface-600'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-neutral-500'}`} />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-200">{v.label}</span>
                <span className="text-[9px] font-mono text-neutral-600 ml-2">{v.version}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[9px] text-neutral-600">
                  <User size={9} />{v.author}
                </span>
                <span className="flex items-center gap-1 text-[9px] text-neutral-600">
                  <Clock size={9} />{new Date(v.createdAt).toLocaleDateString('es')}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-neutral-600">{v.nodes.length} nodos · {v.edges.length} conexiones</span>
              </div>
              {i === 0 && (
                <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-900/40 text-blue-400 text-[8px] font-semibold rounded uppercase tracking-wider border border-blue-900/50">
                  Actual
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
