import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import type { LogEntry, LogLevel } from '../../types/execution';

interface LogPanelProps {
  logs: LogEntry[];
  lang: string;
}

const LEVEL_CONFIG: Record<LogLevel, { color: string; label: string; bg: string }> = {
  system:  { color: 'text-neutral-500',  label: 'SYS  ', bg: '' },
  info:    { color: 'text-sky-400',      label: 'INFO ', bg: '' },
  debug:   { color: 'text-neutral-500',  label: 'DEBUG', bg: '' },
  warn:    { color: 'text-warning-400',  label: 'WARN ', bg: '' },
  error:   { color: 'text-error-400',    label: 'ERROR', bg: 'bg-error-500/5' },
  success: { color: 'text-success-400',  label: 'OK   ', bg: 'bg-success-500/5' },
};

function formatTs(ts: number) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export function LogPanel({ logs, lang }: LogPanelProps) {
  const isEs = lang === 'es';
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-surface-700 flex-shrink-0">
        <Terminal size={13} className="text-neutral-500" />
        <span className="text-xs font-medium text-neutral-400">
          {isEs ? 'Live Logs' : 'Live Logs'}
        </span>
        <span className="ml-auto text-[10px] text-neutral-600 font-mono">
          {logs.length} {isEs ? 'entradas' : 'entries'}
        </span>
        {/* Blinking cursor when live */}
        {logs.length > 0 && (
          <span className="w-1.5 h-3 bg-brand-400 opacity-80 animate-pulse rounded-sm" />
        )}
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed px-2 py-2 space-y-0">
        {logs.length === 0 ? (
          <p className="text-neutral-700 px-2 pt-2">
            {isEs ? '// Los logs aparecerán aquí durante la ejecución...' : '// Logs will appear here during execution...'}
          </p>
        ) : (
          logs.map((log) => {
            const cfg = LEVEL_CONFIG[log.level];
            return (
              <div
                key={log.id}
                className={`flex gap-2 px-1.5 py-0.5 rounded hover:bg-surface-750 transition-colors ${cfg.bg}`}
              >
                <span className="text-neutral-700 flex-shrink-0 select-none">
                  {formatTs(log.ts)}
                </span>
                <span className={`flex-shrink-0 font-bold select-none ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="text-brand-400/80 flex-shrink-0 max-w-[120px] truncate">
                  {log.agent}
                </span>
                <span className="text-neutral-300 flex-1 break-words">
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
