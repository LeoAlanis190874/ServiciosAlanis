import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "es" | "en" | "pt";

const STORAGE_KEY = "sa.lang";

type Dict = Record<string, string>;

const dictionaries: Record<Lang, Dict> = {
  es: {
    "nav.services": "Servicios",
    "nav.howItWorks": "Cómo funciona",
    "nav.forPros": "Para profesionales",
    "nav.professionals": "Profesionales",
    "cta.signIn": "Iniciar sesión",
    "cta.start": "Comenzar",
    "common.language": "Idioma",
    "tagline": "Ayuda profesional cerca de ti",
  },
  en: {
    "nav.services": "Services",
    "nav.howItWorks": "How it works",
    "nav.forPros": "For professionals",
    "nav.professionals": "Professionals",
    "cta.signIn": "Sign in",
    "cta.start": "Get started",
    "common.language": "Language",
    "tagline": "Professional help near you",
  },
  pt: {
    "nav.services": "Serviços",
    "nav.howItWorks": "Como funciona",
    "nav.forPros": "Para profissionais",
    "nav.professionals": "Profissionais",
    "cta.signIn": "Entrar",
    "cta.start": "Começar",
    "common.language": "Idioma",
    "tagline": "Ajuda profissional perto de você",
  },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    try {
      const saved = (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)) as Lang | null;
      if (saved && (saved === "es" || saved === "en" || saved === "pt")) setLangState(saved);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang: (l) => {
        setLangState(l);
        try {
          window.localStorage.setItem(STORAGE_KEY, l);
          document.documentElement.lang = l;
        } catch {}
      },
      t: (key) => dictionaries[lang][key] ?? dictionaries.es[key] ?? key,
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
];
