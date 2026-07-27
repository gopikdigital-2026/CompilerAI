import { Lightbulb } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface ExecutiveSummaryProps {
  summary: string | null;
  isEmpty: boolean;
}

export function ExecutiveSummary({ summary, isEmpty }: ExecutiveSummaryProps) {
  const { t } = useTranslation();
  const d = t.dashboard;

  return (
    <div data-testid="executive-summary" className="card p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
          <Lightbulb size={18} className="text-brand-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-100 mb-2">{d.executiveSummary}</h3>
          {isEmpty || !summary ? (
            <p className="text-sm text-neutral-400">{d.noData}</p>
          ) : (
            <p className="text-sm text-neutral-300 leading-relaxed">{summary}</p>
          )}
        </div>
      </div>
    </div>
  );
}
