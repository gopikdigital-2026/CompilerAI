import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useTranslation } from '../hooks/useTranslation';
import { signUp } from '../services/auth.service';
import { createOrganizationWithOwner } from '../services/organizations.service';

interface RegisterProps {
  onNavigate: (page: string) => void;
}

export function Register({ onNavigate }: RegisterProps) {
  const { t } = useTranslation();
  const a = t.auth;
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUp(form.email, form.password, form.name);
      await createOrganizationWithOwner(form.company || form.name);
      // Auth state change in AuthContext handles redirect
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : a.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColors = ['', 'bg-error-500', 'bg-warning-500', 'bg-success-500'];
  const strengthLabels = ['', a.passwordStrengthWeak, a.passwordStrengthMedium, a.passwordStrengthStrong];

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
          <h2 className="text-3xl font-bold text-neutral-100 mb-3">{a.registerWelcome}</h2>
          <p className="text-neutral-400 text-base leading-relaxed mb-8">{a.registerWelcomeSub}</p>
          <div className="space-y-3">
            {a.planFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-accent-400" />
                </div>
                <span className="text-sm text-neutral-300">{feature}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 p-4 bg-surface-700/50 border border-surface-600 rounded-xl">
            <p className="text-xs text-neutral-500 italic">{a.testimonial}</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-7 h-7 rounded-full bg-brand-gradient" />
              <div>
                <p className="text-xs font-medium text-neutral-300">{a.testimonialName}</p>
                <p className="text-xs text-neutral-600">{a.testimonialRole}</p>
              </div>
            </div>
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
            <h1 className="text-2xl font-bold text-neutral-100 mb-1">{a.registerTitle}</h1>
            <p className="text-sm text-neutral-500">{a.registerSubtitle}</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-error-500/10 border border-error-500/20 rounded-lg text-sm text-error-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">{a.fullName}</label>
                <input type="text" className="input-field" placeholder={a.fullNamePlaceholder} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">{a.company}</label>
                <input type="text" className="input-field" placeholder={a.companyPlaceholder} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">{a.workEmail}</label>
              <input type="email" className="input-field" placeholder={a.emailPlaceholder} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">{a.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder={a.passwordMin}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((lvl) => (
                      <div key={lvl} className={`h-1 flex-1 rounded-full transition-all duration-300 ${lvl <= passwordStrength ? strengthColors[passwordStrength] : 'bg-surface-600'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-neutral-500">{strengthLabels[passwordStrength]}</span>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2.5 pt-1">
              <input type="checkbox" id="terms" className="mt-0.5 rounded" required />
              <label htmlFor="terms" className="text-xs text-neutral-500 leading-relaxed">
                {a.terms}{' '}
                <a href="#" className="text-brand-400 hover:underline">{a.termsLink}</a>
                {' '}{a.and}{' '}
                <a href="#" className="text-brand-400 hover:underline">{a.privacyLink}</a>
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t.common.loading : <>{a.createAccount} <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-600" />
            <span className="text-xs text-neutral-600">{a.orRegisterWith}</span>
            <div className="flex-1 h-px bg-surface-600" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {['Google', 'GitHub'].map((provider) => (
              <button key={provider} className="btn-secondary justify-center text-sm py-2.5">{provider}</button>
            ))}
          </div>

          <p className="text-center text-sm text-neutral-500 mt-6">
            {a.hasAccount}{' '}
            <button onClick={() => onNavigate('login')} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              {a.loginLink}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
