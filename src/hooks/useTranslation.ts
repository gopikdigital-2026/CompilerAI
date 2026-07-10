import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../lib/translations';

export function useTranslation() {
  const { lang } = useLanguage();
  return { t: translations[lang], lang };
}
