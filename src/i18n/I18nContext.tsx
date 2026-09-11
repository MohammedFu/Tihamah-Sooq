import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ar } from "./locales/ar";
import { en } from "./locales/en";
import type { Direction, Locale, Translations } from "./types";

export interface I18nContextType {
  locale: Locale;
  dir: Direction;
  t: Translations;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  formatNumber: (value: number) => string;
  formatMoney: (value: number) => string;
  formatDate: (value: string | number | Date) => string;
}

export const LOCALE_STORAGE_KEY = "tihamah_locale";

export const dictionaries: Record<Locale, Translations> = { ar, en };

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) return initialLocale;
    if (typeof window === "undefined") return "ar";
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
      if (stored === "ar" || stored === "en") return stored;
    } catch {
      // Storage access blocked or unavailable
    }
    return "ar";
  });

  const dir: Direction = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", dir);
  }, [locale, dir]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Storage access error
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "ar" ? "en" : "ar");
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(value);
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (value: string | number | Date) => {
    const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        dir,
        t: dictionaries[locale],
        setLocale,
        toggleLocale,
        formatNumber,
        formatMoney,
        formatDate,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: "ar",
      dir: "rtl",
      t: ar,
      setLocale: () => {},
      toggleLocale: () => {},
      formatNumber: (v: number) => new Intl.NumberFormat("ar-SA").format(v),
      formatMoney: (v: number) =>
        new Intl.NumberFormat("ar-SA", {
          style: "currency",
          currency: "SAR",
          maximumFractionDigits: 2,
        }).format(v),
      formatDate: (v: string | number | Date) =>
        new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(
          typeof v === "string" || typeof v === "number" ? new Date(v) : v
        ),
    };
  }
  return context;
}
