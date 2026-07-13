import React, { createContext, useState, useEffect } from 'react';
import type { Lang } from '../lib/translations';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const LanguageContext = createContext<LanguageContextValue>({
  lang: 'es',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('rc-lang');
    return (stored === 'en' || stored === 'es') ? stored : 'es';
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('rc-lang', newLang);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}
