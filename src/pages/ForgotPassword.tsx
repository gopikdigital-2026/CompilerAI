import React, { useState } from 'react';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useTranslation } from '../hooks/useTranslation';
import { resetPassword } from '../services/auth.service';

interface ForgotPasswordProps {
  onNavigate: (page: string) => void;
}

export function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
  const { t } = useTranslation();
  const a = t.auth;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : a.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-surface-800 relative overflow-hidden p-10">
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30 pointer-events-none" />
        <div className="relative">
          <button onClick={() => onNavigate('landing')} className="btn-ghost -ml-2 mb-8 text-sm">
            <ArrowLeft size={16} /> {t.common.back}
          </button>
          <Logo size="lg" />
        </div>
        <div className="relative flex-1 flex flex-col justify-center max-w-sm">
          <h2 className="text-3xl font-bold text-neutral-100 mb-3">{a.resetPasswordWelcome}</h2>
          <p className="text-neutral-400 text-base leading-relaxed mb-8">{a.resetPasswordWelcomeSub}</p>
          <div className="space-y-4">
            {[
              { step: '1', label: t.lang === 'es' ? 'Introduce tu email de acceso' : 'Enter your sign-in email' },
              { step: '2', label: t.lang === 'es' ? 'Revisa tu bandeja de entrada' : 'Check your inbox' },
              { step: '3', label: t.lang === 'es' ? 'Haz clic en el enlace de recuperación' : 'Click the recovery link' },
              { step: '4', label: t.lang === 'es' ? 'Establece una nueva contraseña' : 'Set a new password' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-brand-400">{item.step}</span>
                </div>
                <span className="text-sm text-neutral-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-auto">
          <p className="text-xs text-neutral-600">© 2025 Compiler AI</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="lg:hidden mb-8">
          <button onClick={() => onNavigate('landing')} className="btn-ghost -ml-2 mb-6 text-sm">
            <ArrowLeft size={16} /> {t.common.back}
          </button>
          <Logo size="md" />
        </div>

        <div className="w-full max-w-sm">
          {sent ? (
            <div className="text-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-success-500/15 border border-success-500/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={26} className="text-success-400" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-100 mb-2">{a.resetEmailSent}</h1>
              <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
                {t.lang === 'es'
                  ? `Hemos enviado un enlace a ${email}. El enlace expira en 1 hora.`
                  : `We sent a link to ${email}. The link expires in 1 hour.`}
              </p>
              <button onClick={() => onNavigate('login')} className="btn-primary w-full justify-center py-3">
                {a.backToLogin}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center mb-4">
                  <Mail size={22} className="text-brand-400" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-100 mb-1">{a.resetPasswordTitle}</h1>
                <p className="text-sm text-neutral-500">{a.resetPasswordSubtitle}</p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-error-500/10 border border-error-500/20 rounded-lg text-sm text-error-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">{a.email}</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder={a.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={!email.trim() || loading}
                  className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (t.lang === 'es' ? 'Enviando...' : 'Sending...') : a.sendResetLink}
                </button>
              </form>

              <p className="text-center text-sm text-neutral-500 mt-6">
                <button onClick={() => onNavigate('login')} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  {a.backToLogin}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
