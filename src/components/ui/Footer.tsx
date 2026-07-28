import { useLanguage } from '../hooks/useLanguage';

interface FooterLink {
  label: string;
  page?: string;
  href?: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterProps {
  onNavigate?: (page: string) => void;
  columns?: FooterColumn[];
  tagline?: string;
  showLegal?: boolean;
}

export function Footer({ onNavigate, columns = [], tagline, showLegal = true }: FooterProps) {
  const { lang } = useLanguage();
  const isEnglish = lang === 'en';

  return (
    <footer className="border-t border-surface-700 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className={`grid gap-8 mb-10 ${columns.length > 0 ? 'md:grid-cols-5' : ''}`}>
          {tagline && (
            <div className={columns.length > 0 ? 'md:col-span-2' : ''}>
              <p className="text-sm text-neutral-500 leading-relaxed max-w-xs">{tagline}</p>
            </div>
          )}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.page && onNavigate ? (
                      <button
                        onClick={() => onNavigate(link.page!)}
                        className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors text-left"
                      >
                        {link.label}
                      </button>
                    ) : link.href ? (
                      <a href={link.href} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <span className="text-sm text-neutral-500">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {showLegal && (
          <div className="border-t border-surface-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              {onNavigate ? (
                <>
                  <button onClick={() => onNavigate('terms')} className="text-neutral-500 hover:text-brand-400 transition-colors">
                    {isEnglish ? 'Terms of Service' : 'Términos de Servicio'}
                  </button>
                  <button onClick={() => onNavigate('privacy')} className="text-neutral-500 hover:text-brand-400 transition-colors">
                    {isEnglish ? 'Privacy Policy' : 'Política de Privacidad'}
                  </button>
                </>
              ) : (
                <>
                  <a href="#terms" className="text-neutral-500 hover:text-brand-400 transition-colors">
                    {isEnglish ? 'Terms of Service' : 'Términos de Servicio'}
                  </a>
                  <a href="#privacy" className="text-neutral-500 hover:text-brand-400 transition-colors">
                    {isEnglish ? 'Privacy Policy' : 'Política de Privacidad'}
                  </a>
                </>
              )}
              <a href="mailto:gopik.digital@gmail.com" className="text-neutral-500 hover:text-brand-400 transition-colors">
                gopik.digital@gmail.com
              </a>
            </div>
            <p className="text-xs text-neutral-600">
              © 2026 CompilerAI — {isEnglish ? 'All rights reserved' : 'Todos los derechos reservados'}
            </p>
          </div>
        )}
      </div>
    </footer>
  );
}
