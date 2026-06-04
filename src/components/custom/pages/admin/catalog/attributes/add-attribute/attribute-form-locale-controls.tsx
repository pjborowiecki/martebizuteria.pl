import { createContext, type JSX, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import type { ProductAttributeLocaleCode } from "~/src/modules/product-attribute/product-attribute.types";

interface AttributeFormLocaleControlsContextValue {
  readonly activeLocale: ProductAttributeLocaleCode;
  readonly clearLocaleSubmitError: () => void;
  readonly focusIncompleteLocales: (locales: readonly ProductAttributeLocaleCode[]) => void;
  readonly incompleteLocales: readonly ProductAttributeLocaleCode[];
  readonly localeSubmitError: boolean;
  readonly setActiveLocale: (locale: ProductAttributeLocaleCode) => void;
}

const AttributeFormLocaleControlsContext = createContext<AttributeFormLocaleControlsContextValue | undefined>(undefined);

const ZERO_LENGTH = 0;
const FIRST_INDEX = 0;

export function AttributeFormLocaleControlsProvider({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const [activeLocale, setActiveLocale] = useState<ProductAttributeLocaleCode>(DEFAULT_LOCALE);
  const [incompleteLocales, setIncompleteLocales] = useState<readonly ProductAttributeLocaleCode[]>([]);
  const [localeSubmitError, setLocaleSubmitError] = useState(false);

  const clearLocaleSubmitError = useCallback(() => {
    setIncompleteLocales([]);
    setLocaleSubmitError(false);
  }, []);

  const focusIncompleteLocales = useCallback((locales: readonly ProductAttributeLocaleCode[]) => {
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

  return <AttributeFormLocaleControlsContext.Provider value={value}>{children}</AttributeFormLocaleControlsContext.Provider>;
}

export function useAttributeFormLocaleControls(): AttributeFormLocaleControlsContextValue {
  const context = useContext(AttributeFormLocaleControlsContext);

  if (context === undefined) {
    throw new Error("useAttributeFormLocaleControls must be used within AttributeFormLocaleControlsProvider");
  }

  return context;
}
