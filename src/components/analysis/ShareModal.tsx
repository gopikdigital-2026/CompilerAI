import { useState } from 'react';
import { X, Link2, Mail, Download, Send, Loader2, CheckCircle, Clock } from 'lucide-react';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useOrganization } from '../../hooks/useOrganization';
import { useAuth } from '../../hooks/useAuth';
import { track } from '../../lib/telemetry';
import { shareReport, type ShareMethod, type ShareRecord } from '../../lib/shareService';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
}

const methodInfo: { id: ShareMethod; label: string; icon: typeof Link2; desc: string }[] = [
  { id: 'link', label: 'Enlace seguro', icon: Link2, desc: 'Genera un enlace temporal' },
  { id: 'email', label: 'Invitación por email', icon: Mail, desc: 'Envía un email con acceso' },
  { id: 'download', label: 'Descarga protegida', icon: Download, desc: 'Descarga con marca de agua' },
];

export function ShareModal({ open, onClose }: ShareModalProps) {
  const analysis = useAnalysis();
  const { activeOrg } = useOrganization();
  const { user } = useAuth();
  const [method, setMethod] = useState<ShareMethod>('link');
  const [email, setEmail] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<ShareRecord | null>(null);
  const [history, setHistory] = useState<ShareRecord[]>([]);

  if (!open || !analysis.result) return null;

  async function handleShare() {
    if (!activeOrg || !analysis.currentAnalysisId) return;
    setSharing(true);
    track('report_shared', { method });

    try {
      const record = await shareReport(
        activeOrg.id,
        analysis.currentAnalysisId,
        method,
        method === 'email' ? email : null,
        user?.email ?? '',
      );
      setShareResult(record);
      setSharing(false);
    } catch {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" data-testid="share-modal">
      <div className="card p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-100">Compartir informe</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300"><X size={18} /></button>
        </div>

        {shareResult ? (
          <div data-testid="share-success" className="space-y-3">
            <div className="flex items-center gap-2 text-success-400">
              <CheckCircle size={20} />
              <p className="text-sm font-medium">Informe compartido</p>
            </div>
            {shareResult.shareToken && (
              <div className="p-3 rounded-lg bg-surface-800 border border-surface-700">
                <p className="text-[10px] text-neutral-600 mb-1">Enlace seguro:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-brand-400 flex-1 truncate">
                    {window.location.origin}/shared/{shareResult.shareToken}
                  </code>
                  <button
                    onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/shared/${shareResult.shareToken}`)}
                    className="text-xs text-brand-400 hover:text-brand-300"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}
            <button onClick={() => { setShareResult(null); onClose(); }} className="btn-ghost w-full text-sm">Cerrar</button>
          </div>
        ) : (
          <>
            {/* Method selection */}
            <div className="space-y-2 mb-4">
              {methodInfo.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    data-testid={`share-method-${m.id}`}
                    onClick={() => setMethod(m.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3 ${
                      method === m.id
                        ? 'border-brand-500/30 bg-brand-500/10'
                        : 'border-surface-700 bg-surface-800 hover:border-surface-600'
                    }`}
                  >
                    <Icon size={16} className={method === m.id ? 'text-brand-400' : 'text-neutral-500'} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${method === m.id ? 'text-brand-400' : 'text-neutral-300'}`}>{m.label}</p>
                      <p className="text-[10px] text-neutral-600">{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Email input */}
            {method === 'email' && (
              <div className="mb-4">
                <label className="text-xs text-neutral-500 mb-1 block">Email del destinatario</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colega@empresa.com"
                  className="w-full text-sm bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-neutral-200"
                />
              </div>
            )}

            {/* Share button */}
            <button
              data-testid="share-execute"
              onClick={handleShare}
              disabled={sharing || (method === 'email' && !email)}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2"
            >
              {sharing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sharing ? 'Compartiendo...' : 'Compartir'}
            </button>

            <p className="text-[10px] text-neutral-600 text-center mt-3">
              Se respetan los permisos de {activeOrg?.name ?? 'tu organización'}.
              Se registra fecha, usuario y destinatario.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
