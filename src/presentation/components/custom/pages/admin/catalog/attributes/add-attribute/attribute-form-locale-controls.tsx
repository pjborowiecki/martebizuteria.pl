import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"

import { type ProductAttributeLocaleCode } from "~/src/modules/product-attribute/product-attribute.types"

interface AttributeFormLocaleControlsContextValue {
  readonly activeLocale: ProductAttributeLocaleCode
  readonly clearLocaleSubmitError: () => void
  readonly focusIncompleteLocales: (locales: readonly ProductAttributeLocaleCode[]) => void
  readonly incompleteLocales: readonly ProductAttributeLocaleCode[]
  readonly localeSubmitError: boolean
  readonly setActiveLocale: (locale: ProductAttributeLocaleCode) => void
}

const AttributeFormLocaleControlsContext = createContext<AttributeFormLocaleControlsContextValue | undefined>(undefined)

export const AttributeFormLocaleControlsProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const [activeLocale, setActiveLocale] = useState<ProductAttributeLocaleCode>(DEFAULT_LOCALE)
  const [incompleteLocales, setIncompleteLocales] = useState<readonly ProductAttributeLocaleCode[]>([])
  const [localeSubmitError, setLocaleSubmitError] = useState(false)

  const clearLocaleSubmitError = useCallback(() => {
    setIncompleteLocales([])
    setLocaleSubmitError(false)
  }, [])

  const focusIncompleteLocales = useCallback((locales: readonly ProductAttributeLocaleCode[]) => {
    const [firstIncompleteLocale] = locales
    setIncompleteLocales(locales)
    setLocaleSubmitError(firstIncompleteLocale !== undefined)
    if (firstIncompleteLocale !== undefined) {
      setActiveLocale(firstIncompleteLocale)
    }
  }, [])

  const value = useMemo(
    () => ({
      activeLocale,
      clearLocaleSubmitError,
      focusIncompleteLocales,
      incompleteLocales,
      localeSubmitError,
      setActiveLocale,
    }),
    [activeLocale, clearLocaleSubmitError, focusIncompleteLocales, incompleteLocales, localeSubmitError],
  )

  return <AttributeFormLocaleControlsContext.Provider value={value}>{children}</AttributeFormLocaleControlsContext.Provider>
}

export const useAttributeFormLocaleControls = (): AttributeFormLocaleControlsContextValue => {
  const context = useContext(AttributeFormLocaleControlsContext)

  if (context === undefined) {
    throw new Error("useAttributeFormLocaleControls must be used within AttributeFormLocaleControlsProvider")
  }

  return context
}
