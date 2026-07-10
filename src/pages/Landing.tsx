import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

interface LandingProps {
  onNavigate: (page: string) => void;
}

export function Landing({ onNavigate }: LandingProps) {
  const { t } = useTranslation();
  const { lang, setLang } = useLanguage();
  const l = t.landing;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const NAV_LINKS = [t.nav.product, t.nav.useCases, t.nav.pricing, t.nav.docs];

  return (
    <div className="min-h-screen bg-surface-900 text-neutral-100">
      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-surface-900/95 backdrop-blur-md border-b border-surface-700' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <button key={link} className="btn-ghost text-sm">{link}</button>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-surface-700 transition-all text-xs font-semibold"
            >
              <Globe size={15} />
              <span className="uppercase tracking-wide">{lang}</span>
            </button>
            <button onClick={() => onNavigate('login')} className="btn-ghost text-sm">
              {t.nav.signIn}
            </button>
            <button onClick={() => onNavigate('register')} className="btn-primary text-sm">
              {t.nav.startFree}
            </button>
          </div>
          <button className="md:hidden btn-ghost p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-surface-900/98 backdrop-blur-md border-b border-surface-700 px-6 pb-4 animate-fade-in">
            {NAV_LINKS.map((link) => (
              <button key={link} className="block w-full text-left py-3 text-sm text-neutral-300 hover:text-neutral-100 border-b border-surface-700 last:border-0">
                {link}
              </button>
            ))}
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                className="btn-secondary text-sm w-full justify-center"
              >
                <Globe size={15} /> {lang === 'es' ? 'English' : 'Español'}
              </button>
              <button onClick={() => onNavigate('login')} className="btn-secondary text-sm w-full justify-center">{t.nav.signIn}</button>
              <button onClick={() => onNavigate('register')} className="btn-primary text-sm w-full justify-center">{t.nav.startFree}</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full text-xs text-brand-400 font-medium mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
            {l.heroBadge}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 animate-slide-up">
            {l.heroTitle1}{' '}
            <span className="bg-gradient-to-r from-brand-400 via-blue-400 to-accent-400 bg-clip-text text-transparent">
              {l.heroTitleHighlight}
            </span>{' '}
            {l.heroTitle2}
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-8 leading-relaxed animate-slide-up">
            {l.heroSubtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {l.heroTags.map((tag) => (
              <span key={tag} className="badge-brand text-xs px-3 py-1">{tag}</span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-slide-up">
            <button onClick={() => onNavigate('register')} className="btn-primary text-base px-7 py-3">
              {l.heroCTAPrimary} <ArrowRight size={18} />
            </button>
            <button onClick={() => onNavigate('login')} className="btn-secondary text-base px-7 py-3">
              {l.heroCTASecondary}
            </button>
          </div>
          <p className="text-xs text-neutral-600 mt-4">{l.heroDisclaimer}</p>
        </div>

        {/* Hero visual */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="absolute -inset-1 bg-brand-gradient opacity-20 blur-xl rounded-2xl" />
          <div className="relative card border-surface-600 p-1 rounded-2xl overflow-hidden">
            <div className="bg-surface-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-error-500" />
                <div className="w-3 h-3 rounded-full bg-warning-500" />
                <div className="w-3 h-3 rounded-full bg-success-500" />
                <span className="ml-3 text-xs text-neutral-600 font-mono">{l.dashboardMockTitle}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: l.mockAgentsActive, value: '12', color: 'text-brand-400' },
                  { label: l.mockWorkflowsToday, value: '847', color: 'text-accent-400' },
                  { label: l.mockSuccessRate, value: '99.2%', color: 'text-success-400' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-surface-700 rounded-lg p-4 border border-surface-600">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-surface-700 rounded-lg p-4 border border-surface-600">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-neutral-400 font-medium">{l.mockPipelineActive} Lead Nurture</span>
                  <span className="badge-success text-xs">{l.mockRunning}</span>
                </div>
                <div className="flex items-center gap-2">
                  {l.mockPipelineSteps.map((step, i) => (
                    <React.Fragment key={step}>
                      <div className={`px-2.5 py-1 rounded text-xs font-mono ${i < 3 ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : i === 3 ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30 animate-pulse' : 'bg-surface-600 text-neutral-500 border border-surface-500'}`}>
                        {step}
                      </div>
                      {i < 5 && <div className={`h-px flex-1 ${i < 3 ? 'bg-brand-500/40' : 'bg-surface-600'}`} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-surface-700 bg-surface-850">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '10M+', label: l.statsLabel1 },
            { value: '500+', label: l.statsLabel2 },
            { value: '99.9%', label: l.statsLabel3 },
            { value: '3 min', label: l.statsLabel4 },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">{s.value}</p>
              <p className="text-sm text-neutral-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="badge-accent mb-4 inline-flex">{l.featuresTag}</span>
            <h2 className="text-4xl font-bold mb-4">{l.featuresTitle}</h2>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">{l.featuresSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(['🤖', '⚡', '🔗', '📊', '🛡️', '🚀'] as const).map((icon, i) => (
              <div key={i} className="card-hover p-6 group">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="text-base font-semibold text-neutral-100 mb-2">{l.features[i].title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{l.features[i].description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-6 bg-surface-850">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="badge-brand mb-4 inline-flex">{l.useCasesTag}</span>
            <h2 className="text-4xl font-bold mb-4">{l.useCasesTitle}</h2>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">{l.useCasesSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {(['from-brand-600/20 to-brand-500/5', 'from-accent-600/20 to-accent-500/5', 'from-purple-600/20 to-purple-500/5'] as const).map((gradient, i) => {
              const uc = l.useCases[i];
              const borders = ['border-brand-500/20', 'border-accent-500/20', 'border-purple-500/20'];
              return (
                <div key={i} className={`card border ${borders[i]} p-6 bg-gradient-to-br ${gradient} hover:scale-[1.02] transition-transform duration-200`}>
                  <span className="badge-brand text-xs mb-4 inline-flex">{uc.category}</span>
                  <h3 className="text-lg font-semibold text-neutral-100 mb-3">{uc.title}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed mb-5">{uc.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {uc.metrics.map((m) => (
                      <span key={m} className="text-xs bg-surface-800/60 text-neutral-300 px-2.5 py-1 rounded-full border border-surface-600">{m}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-brand-gradient opacity-10 blur-3xl rounded-3xl pointer-events-none" />
            <div className="relative card p-12 border-brand-500/20">
              <h2 className="text-4xl font-bold mb-4">
                {l.ctaTitle1}{' '}
                <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
                  {l.ctaHighlight}
                </span>
                {l.ctaTitle2}
              </h2>
              <p className="text-neutral-400 text-lg mb-8">{l.ctaSubtitle}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => onNavigate('register')} className="btn-primary text-base px-8 py-3">
                  {l.ctaPrimary} <ArrowRight size={18} />
                </button>
                <button className="btn-secondary text-base px-8 py-3">
                  {l.ctaSecondary}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-700 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-10">
            <div className="md:col-span-2">
              <Logo size="md" />
              <p className="text-sm text-neutral-500 mt-3 leading-relaxed max-w-xs">{l.footerTagline}</p>
            </div>
            {l.footerCols.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}><a href="#" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-surface-700 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-neutral-600">{l.footerCopyright}</p>
            <p className="text-xs text-neutral-600">{l.footerBuilt}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
