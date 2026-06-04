import { createContext, type JSX, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";
import type { Locale } from "~/src/constants/types";

interface CatalogFormLocaleControlsContextValue {
  readonly activeLocale: Locale;
  readonly clearLocaleSubmitError: () => void;
  readonly focusIncompleteLocales: (locales: readonly Locale[]) => void;
  readonly incompleteLocales: readonly Locale[];
  readonly localeSubmitError: boolean;
  readonly setActiveLocale: (locale: Locale) => void;
}

const CatalogFormLocaleControlsContext = createContext<CatalogFormLocaleControlsContextValue | undefined>(undefined);

const ZERO_LENGTH = 0;
const FIRST_INDEX = 0;

export function CatalogFormLocaleControlsProvider({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const [activeLocale, setActiveLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [incompleteLocales, setIncompleteLocales] = useState<readonly Locale[]>([]);
  const [localeSubmitError, setLocaleSubmitError] = useState(false);

  const clearLocaleSubmitError = useCallback(() => {
    setIncompleteLocales([]);
    setLocaleSubmitError(false);
  }, []);

  const focusIncompleteLocales = useCallback((locales: readonly Locale[]) => {
    setIncompleteLocales(locales);
    setLocaleSubmitError(locales.length > ZERO_LENGTH);
    if (locales.length > ZERO_LENGTH) {
      setActiveLocale(locales[FIRST_INDEX]);
    } else {
      setLocaleSubmitError(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      activeLocale,
      clearLocaleSubmitError,
      focusIncompleteLocales,
      incompleteLocales,
      localeSubmitError,
      setActiveLocale
    }),
    [activeLocale, clearLocaleSubmitError, focusIncompleteLocales, incompleteLocales, localeSubmitError]
  );

  return <CatalogFormLocaleControlsContext.Provider value={value}>{children}</CatalogFormLocaleControlsContext.Provider>;
}

export function useCatalogFormLocaleControls(): CatalogFormLocaleControlsContextValue {
  const context = useContext(CatalogFormLocaleControlsContext);

  if (context === undefined) {
    throw new Error("useCatalogFormLocaleControls must be used within CatalogFormLocaleControlsProvider");
  }

  return context;
}

export function formatCatalogLocaleList(
  locales: readonly Locale[],
  formatLocale: (locale: Locale) => string = (locale) => locale.toUpperCase()
): string {
  return locales.map((locale) => formatLocale(locale)).join(", ");
}
