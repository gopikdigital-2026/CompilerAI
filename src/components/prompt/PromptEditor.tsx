import React, { useRef, useState } from 'react';
import {
  Save, RotateCcw, Clock, Hash, Type,
  ChevronDown, ChevronRight, History,
} from 'lucide-react';
import type { PromptVersion } from '../../types/prompt';

interface PromptEditorProps {
  content:        string;
  tokens:         number;
  chars:          number;
  history:        PromptVersion[];
  onContentChange: (v: string) => void;
  onSaveVersion:  (label?: string) => void;
  onRestoreVersion: (v: PromptVersion) => void;
}

function minsAgoLabel(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (diff < 1) return 'ahora';
  if (diff < 60) return `${Math.round(diff)}m`;
  return `${Math.round(diff / 60)}h`;
}

export function PromptEditor({
  content, tokens, chars, history,
  onContentChange, onSaveVersion, onRestoreVersion,
}: PromptEditorProps) {
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const tokenColor = tokens > 1000 ? 'text-error-400' : tokens > 500 ? 'text-warning-400' : 'text-success-400';
  const charMax = 4000;
  const charPct = Math.min(100, (chars / charMax) * 100);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-700 flex-shrink-0">
        <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Prompt Editor</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSaveVersion()}
            className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border border-surface-600 text-neutral-500 hover:text-neutral-300 hover:border-surface-500 transition-all"
          >
            <Save size={10} /> Guardar
          </button>
          <button
            onClick={() => setShowHistory(v => !v)}
            className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border transition-all
              ${showHistory ? 'border-sky-500/40 bg-sky-500/10 text-sky-400' : 'border-surface-600 text-neutral-500 hover:text-neutral-300'}`}
          >
            <History size={10} /> Historial
          </button>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="flex-shrink-0 border-b border-surface-700 bg-surface-850 max-h-48 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {[...history].reverse().map((v, i) => (
              <button
                key={v.id}
                onClick={() => { onRestoreVersion(v); setShowHistory(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-700 transition-colors text-left"
              >
                <Clock size={9} className="text-neutral-700 flex-shrink-0" />
                <span className="flex-1 text-[10px] text-neutral-400 truncate">{v.label}</span>
                <span className="text-[9px] text-neutral-700">{v.tokens}t</span>
                <span className="text-[9px] text-neutral-700">{minsAgoLabel(v.createdAt)}</span>
                {i === 0 && <span className="text-[9px] text-sky-400">actual</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Textarea */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => onContentChange(e.target.value)}
          placeholder="Escribe tu prompt aquí... Describe lo que quieres que el sistema automatice."
          className="w-full h-full resize-none bg-transparent text-sm text-neutral-200 placeholder:text-neutral-700
            px-4 py-3 leading-relaxed focus:outline-none font-mono"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          spellCheck={false}
        />
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 border-t border-surface-700 px-4 py-2 bg-surface-850">
        {/* Char progress */}
        <div className="h-0.5 bg-surface-700 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${charPct > 90 ? 'bg-error-500' : charPct > 70 ? 'bg-warning-500' : 'bg-sky-500'}`}
            style={{ width: `${charPct}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1 text-neutral-600">
            <Type size={9} /> <span className={charPct > 90 ? 'text-error-400' : 'text-neutral-500'}>{chars.toLocaleString()}</span> chars
          </span>
          <span className={`flex items-center gap-1 ${tokenColor}`}>
            <Hash size={9} /> ~{tokens.toLocaleString()} tokens
          </span>
          <span className="ml-auto text-neutral-700 text-[9px]">autoguardado</span>
        </div>
      </div>
    </div>
  );
}
