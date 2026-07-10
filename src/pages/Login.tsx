import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useTranslation } from '../hooks/useTranslation';
import { signIn } from '../services/auth.service';

interface LoginProps {
  onNavigate: (page: string) => void;
}

export function Login({ onNavigate }: LoginProps) {
  const { t } = useTranslation();
  const a = t.auth;
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(form.email, form.password);
      // Auth state change in AuthContext will handle the redirect
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
          <h2 className="text-3xl font-bold text-neutral-100 mb-3">{a.loginWelcome}</h2>
          <p className="text-neutral-400 text-base leading-relaxed">{a.loginWelcomeSub}</p>
          <div className="mt-10 space-y-4">
            {a.loginPanelStats.map((item) => (
              <div key={item.label} className="flex items-center justify-between bg-surface-700/50 border border-surface-600 rounded-lg px-4 py-3">
                <span className="text-sm text-neutral-400">{item.label}</span>
                <span className="text-sm font-medium text-neutral-200">{item.value}</span>
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
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-100 mb-1">{a.loginTitle}</h1>
            <p className="text-sm text-neutral-500">{a.loginSubtitle}</p>
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
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-neutral-300">{a.password}</label>
                <button
                  type="button"
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  onClick={() => onNavigate('forgot-password')}
                >
                  {a.forgotPassword}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder={a.passwordPlaceholder}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t.common.loading : <>{a.signIn} <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-600" />
            <span className="text-xs text-neutral-600">{a.orContinueWith}</span>
            <div className="flex-1 h-px bg-surface-600" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {['Google', 'GitHub'].map((provider) => (
              <button key={provider} className="btn-secondary justify-center text-sm py-2.5">
                {provider}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-neutral-500 mt-6">
            {a.noAccount}{' '}
            <button onClick={() => onNavigate('register')} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              {a.registerLink}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
