import { useState, type ReactNode } from 'react';
import { MessageSquare, X, Bug, Lightbulb, Sparkles, Monitor, Zap, Send } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../hooks/useOrganization';
import { useToast } from './Toast';
import { submitFeedback, type FeedbackType } from '../../services/feedback.service';
import { logger } from '../../lib/logger';

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: typeof Bug; color: string }[] = [
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-error-400' },
  { value: 'idea', label: 'Idea', icon: Lightbulb, color: 'text-warning-400' },
  { value: 'improvement', label: 'Mejora', icon: Sparkles, color: 'text-brand-400' },
  { value: 'ux', label: 'UX', icon: Monitor, color: 'text-accent-400' },
  { value: 'performance', label: 'Rendimiento', icon: Zap, color: 'text-success-400' },
];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        data-testid="feedback-button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-600 shadow-card-hover text-neutral-300 hover:text-neutral-100 hover:border-brand-500/50 transition-all group"
        aria-label="Enviar feedback"
      >
        <MessageSquare size={16} className="text-brand-400 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-medium hidden sm:inline">Enviar feedback</span>
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { activeOrg } = useOrganization();
  const toast = useToast();
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || message.trim().length < 10) return;
    setSubmitting(true);
    try {
      await submitFeedback(user.id, activeOrg?.id ?? null, { type, message: message.trim() });
      toast.showSuccess('Feedback enviado. Gracias por ayudarnos a mejorar.');
      logger.info('feedback_submitted', { type, messageLength: message.length });
      onClose();
    } catch (e) {
      toast.showError('No se pudo enviar el feedback. Inténtalo de nuevo.');
      logger.error('feedback_submit_failed', { error: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        data-testid="feedback-modal"
        className="card p-6 w-full max-w-md mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <MessageSquare size={16} className="text-brand-400" />
            Enviar feedback
          </h3>
          <button onClick={onClose} className="text-neutral-600 hover:text-neutral-400">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-neutral-500 mb-4">Cuéntanos qué encontraste. Tu feedback nos ayuda a mejorar la plataforma.</p>

        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {FEEDBACK_TYPES.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              data-testid={`feedback-type-${value}`}
              onClick={() => setType(value)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all ${
                type === value
                  ? 'border-brand-500/50 bg-brand-500/10'
                  : 'border-surface-600 bg-surface-800 hover:border-surface-500'
              }`}
            >
              <Icon size={14} className={type === value ? color : 'text-neutral-500'} />
              <span className={`text-[10px] font-medium ${type === value ? 'text-neutral-200' : 'text-neutral-500'}`}>{label}</span>
            </button>
          ))}
        </div>

        <textarea
          data-testid="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe el problema o sugerencia con detalle (mínimo 10 caracteres)..."
          rows={4}
          maxLength={2000}
          className="input-base text-sm resize-none mb-3"
        />
        <div className="flex items-center justify-between text-xs text-neutral-600 mb-4">
          <span>{message.length}/2000</span>
          <span>{typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : ''}</span>
        </div>

        <button
          data-testid="feedback-submit"
          onClick={handleSubmit}
          disabled={submitting || message.trim().length < 10}
          className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send size={14} />
          {submitting ? 'Enviando...' : 'Enviar feedback'}
        </button>
      </div>
    </div>
  );
}
