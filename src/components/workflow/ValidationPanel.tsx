import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import type { ValidationIssue } from '../../types/workflow';

interface ValidationPanelProps {
  issues: ValidationIssue[];
  onClose: () => void;
  onSelectNode: (id: string | null) => void;
}

export function ValidationPanel({ issues, onClose, onSelectNode }: ValidationPanelProps) {
  const errors   = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return (
    <div className="absolute top-0 right-0 bottom-0 w-72 bg-surface-900 border-l border-surface-800 shadow-2xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-400" />
          <span className="text-sm font-semibold text-neutral-200">Validación</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:text-neutral-300 rounded hover:bg-surface-700 transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* Summary */}
      <div className="flex gap-3 px-4 py-3 border-b border-surface-800">
        <Pill count={errors.length} label="Errores" color="red" />
        <Pill count={warnings.length} label="Avisos" color="amber" />
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto py-2">
        {issues.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
            <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center">
              <Info size={18} className="text-green-500" />
            </div>
            <p className="text-xs text-neutral-400 text-center">El workflow es válido. No hay problemas.</p>
          </div>
        )}
        {[...errors, ...warnings].map(issue => (
          <button
            key={issue.id}
            onClick={() => issue.nodeId && onSelectNode(issue.nodeId)}
            className="w-full text-left px-4 py-3 hover:bg-surface-800 transition-colors border-b border-surface-800/50"
          >
            <div className="flex items-start gap-2">
              {issue.severity === 'error'
                ? <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                : <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
              }
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-neutral-200 leading-snug">{issue.message}</p>
                <p className="text-[9px] text-neutral-600 mt-0.5 uppercase tracking-wider">{issue.category}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Pill({ count, label, color }: { count: number; label: string; color: 'red' | 'amber' }) {
  const cls = color === 'red'
    ? 'bg-red-900/30 text-red-400 border-red-900/50'
    : 'bg-amber-900/30 text-amber-400 border-amber-900/50';
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold ${cls}`}>
      <span className="text-sm font-bold">{count}</span> {label}
    </div>
  );
}
