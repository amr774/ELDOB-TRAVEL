import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
type Lang = 'en' | 'ar';
const Language = createContext({
  lang: 'en' as Lang,
  toggle: () => {},
  t: (en: string, ar: string) => en || ar,
  money: (value: number) => String(value),
});
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() =>
    localStorage.getItem('eldob-language') === 'ar' ? 'ar' : 'en',
  );
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('eldob-language', lang);
  }, [lang]);
  return (
    <Language.Provider
      value={{
        lang,
        toggle: () => setLang(lang === 'en' ? 'ar' : 'en'),
        t: (en, ar) => (lang === 'ar' ? ar : en),
        money: (value) =>
          new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', {
            style: 'currency',
            currency: 'EGP',
            maximumFractionDigits: 0,
          }).format(value),
      }}
    >
      {children}
    </Language.Provider>
  );
}
export const useLanguage = () => useContext(Language);
