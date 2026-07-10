import React, { useState } from 'react';
import type { MemoryEntry, MemoryType } from '../../types/memory';

const TYPE_CONFIG: Record<MemoryType, { color: string; dot: string; label: string }> = {
  short_term:     { color: 'text-sky-400',     dot: 'bg-sky-400',     label: 'Corta' },
  long_term:      { color: 'text-brand-400',   dot: 'bg-brand-400',   label: 'Larga' },
  organizational: { color: 'text-success-400', dot: 'bg-success-400', label: 'Org' },
  semantic:       { color: 'text-warning-400', dot: 'bg-warning-400', label: 'Sem' },
};

function groupByDay(entries: MemoryEntry[]): Map<string, MemoryEntry[]> {
  const map = new Map<string, MemoryEntry[]>();
  for (const e of entries) {
    const day = new Date(e.learnedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(e);
  }
  return map;
}

interface MemoryTimelineProps {
  entries: MemoryEntry[];
}

export function MemoryTimeline({ entries }: MemoryTimelineProps) {
  const [hoveredEntry, setHoveredEntry] = useState<MemoryEntry | null>(null);

  // Sort most recent first, take last 7 days worth
  const sorted = [...entries].sort(
    (a, b) => new Date(b.learnedAt).getTime() - new Date(a.learnedAt).getTime()
  );
  const byDay = groupByDay(sorted);
  const days = Array.from(byDay.keys()).slice(0, 7);

  return (
    <div className="flex flex-col flex-shrink-0">
      <div className="flex items-center gap-2 px-4 pt-2 pb-1 border-t border-surface-700">
        <span className="text-[10px] uppercase tracking-wider text-neutral-600 font-medium">Timeline de aprendizaje</span>
        <span className="text-[10px] text-neutral-700">— últimos {days.length} días activos</span>
        <div className="ml-auto flex items-center gap-3">
          {(Object.keys(TYPE_CONFIG) as MemoryType[]).map(type => {
            const cfg = TYPE_CONFIG[type];
            return (
              <div key={type} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <span className="text-[10px] text-neutral-600">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-end gap-6 px-4 pb-2 overflow-x-auto">
        {days.map(day => {
          const dayEntries = byDay.get(day)!;
          return (
            <div key={day} className="flex flex-col items-center gap-1 flex-shrink-0">
              {/* Entry dots */}
              <div className="flex flex-col gap-0.5 items-center">
                {dayEntries.slice(0, 8).map(entry => {
                  const cfg = TYPE_CONFIG[entry.memoryType];
                  return (
                    <div
                      key={entry.id}
                      title={entry.title}
                      className={`w-2 h-2 rounded-full ${cfg.dot} cursor-pointer hover:scale-150 transition-transform`}
                      onMouseEnter={() => setHoveredEntry(entry)}
                      onMouseLeave={() => setHoveredEntry(null)}
                    />
                  );
                })}
                {dayEntries.length > 8 && (
                  <span className="text-[9px] text-neutral-700">+{dayEntries.length - 8}</span>
                )}
              </div>
              {/* Day label */}
              <span className="text-[9px] text-neutral-700 mt-0.5">{day}</span>
            </div>
          );
        })}
        {days.length === 0 && (
          <p className="text-[11px] text-neutral-700 py-2">Sin datos de aprendizaje en el periodo seleccionado.</p>
        )}
      </div>
      {/* Hover tooltip */}
      {hoveredEntry && (
        <div className="mx-4 mb-2 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg">
          <p className="text-[10px] font-medium text-neutral-200">{hoveredEntry.title}</p>
          <p className="text-[9px] text-neutral-600 mt-0.5 line-clamp-1">{hoveredEntry.content.slice(0, 80)}</p>
        </div>
      )}
    </div>
  );
}
