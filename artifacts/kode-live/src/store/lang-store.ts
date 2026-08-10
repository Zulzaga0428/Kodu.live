import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createElement } from "react";
import { TRANSLATIONS, type Lang, type TranslationKey } from "@/lib/i18n";

type LangCtx = {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
};

const LangContext = createContext<LangCtx>({
  lang: "mn",
  toggleLang: () => {},
  t: (key) => TRANSLATIONS.mn[key] ?? key,
});

function getInitialLang(): Lang {
  try { return (localStorage.getItem("kodu-lang") as Lang) ?? "mn"; } catch { return "mn"; }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLang);

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === "mn" ? "en" : "mn";
      try { localStorage.setItem("kodu-lang", next); } catch {}
      return next;
    });
  }, []);

  const t = useCallback((key: TranslationKey) => {
    return TRANSLATIONS[lang][key] ?? key;
  }, [lang]);

  return createElement(LangContext.Provider, { value: { lang, toggleLang, t } }, children);
}

export function useLanguage() {
  return useContext(LangContext);
}
