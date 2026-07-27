import { useState, useRef, useEffect } from 'react';
import {
  X, Send, MessageSquare, AlertTriangle, Target, Clock,
  FileText, Briefcase, Megaphone, DollarSign, TrendingUp, Zap,
  ChevronRight, Loader2, Database,
} from 'lucide-react';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useOrganization } from '../../hooks/useOrganization';
import { useAuth } from '../../hooks/useAuth';
import { track } from '../../lib/telemetry';
import { answerCopilotQuestion, COPILOT_QUESTIONS, type CopilotAnswer } from '../../lib/copilotEngine';

const iconMap: Record<string, typeof AlertTriangle> = {
  AlertTriangle, Target, Clock, FileText, Briefcase, Megaphone, DollarSign, TrendingUp, Zap,
};

interface CopilotPanelProps {
  open: boolean;
  onClose: () => void;
}

export function CopilotPanel({ open, onClose }: CopilotPanelProps) {
  const analysis = useAnalysis();
  const { activeOrg } = useOrganization();
  const { user } = useAuth();
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<CopilotAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      track('copilot_opened', {});
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentAnswer]);

  function handleQuestion(questionId: string) {
    setSelectedQuestion(questionId);
    setLoading(true);
    track('copilot_question', { question_id: questionId });

    // Simulate processing time
    setTimeout(() => {
      const answer = answerCopilotQuestion(questionId, {
        orgName: activeOrg?.name ?? 'Organización',
        orgId: activeOrg?.id ?? '',
        analysisResult: analysis.result,
        execReport: analysis.executiveReport,
      });
      setCurrentAnswer(answer);
      setLoading(false);
      track('copilot_response', { question_id: questionId, has_citations: answer.citations.length > 0 });
    }, 600);
  }

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 animate-fade-in" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-surface-850 border-l border-surface-700 flex flex-col animate-slide-in-right" data-testid="copilot-panel">
        {/* Header */}
        <div className="px-4 py-3 border-b border-surface-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
              <MessageSquare size={16} className="text-brand-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Executive Copilot</h3>
              <p className="text-[10px] text-neutral-500">Responde usando solo el análisis actual</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Suggested questions */}
          {!currentAnswer && !loading && (
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 mb-3">Preguntas sugeridas:</p>
              {COPILOT_QUESTIONS.map((q) => {
                const Icon = iconMap[q.icon] ?? MessageSquare;
                return (
                  <button
                    key={q.id}
                    data-testid={`copilot-question-${q.id}`}
                    onClick={() => handleQuestion(q.id)}
                    className="w-full text-left p-3 rounded-lg bg-surface-800 border border-surface-700 hover:border-brand-500/30 hover:bg-surface-750 transition-colors flex items-center gap-3 group"
                  >
                    <Icon size={14} className="text-neutral-500 group-hover:text-brand-400 flex-shrink-0" />
                    <span className="text-xs text-neutral-300 flex-1">{q.label}</span>
                    <ChevronRight size={12} className="text-neutral-600 group-hover:text-brand-400" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected question */}
          {selectedQuestion && (
            <div className="flex justify-end">
              <div className="bg-brand-500/15 text-brand-300 rounded-lg px-3 py-2 max-w-[85%] text-xs">
                {COPILOT_QUESTIONS.find((q) => q.id === selectedQuestion)?.label ?? selectedQuestion}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 size={14} className="animate-spin text-brand-400" />
              Analizando datos del informe...
            </div>
          )}

          {/* Answer */}
          {currentAnswer && !loading && (
            <div data-testid="copilot-answer" className="space-y-3">
              <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
                {currentAnswer.role && (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-accent-500/10 text-accent-400 mb-2">
                    {currentAnswer.role}
                  </span>
                )}
                <p className="text-sm text-neutral-300 leading-relaxed">{currentAnswer.answer}</p>
              </div>

              {/* Citations */}
              {currentAnswer.citations.length > 0 && (
                <div data-testid="copilot-citations" className="space-y-1.5">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider flex items-center gap-1">
                    <Database size={10} /> Evidencias utilizadas
                  </p>
                  {currentAnswer.citations.map((cite, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-surface-800/50">
                      <span className={`px-1.5 py-0.5 rounded flex-shrink-0 ${cite.confidence >= 70 ? 'bg-success-500/10 text-success-400' : cite.confidence >= 40 ? 'bg-warning-500/10 text-warning-400' : 'bg-error-500/10 text-error-400'}`}>
                        {cite.confidence}%
                      </span>
                      <div className="min-w-0">
                        <span className="text-neutral-400 font-mono text-[10px]">{cite.source}</span>
                        <p className="text-neutral-500">{cite.metric}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentAnswer.citations.length === 0 && (
                <p className="text-xs text-neutral-600 italic">Sin evidencias disponibles para esta respuesta.</p>
              )}

              {/* Ask another */}
              <button
                onClick={() => { setCurrentAnswer(null); setSelectedQuestion(null); }}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                <MessageSquare size={12} /> Hacer otra pregunta
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-700 flex-shrink-0">
          <p className="text-[10px] text-neutral-600 text-center">
            El Copilot usa únicamente datos del análisis actual de {activeOrg?.name ?? 'tu organización'}.
            Nunca accede a datos de otras organizaciones.
          </p>
        </div>
      </div>
    </>
  );
}
