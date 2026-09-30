import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

interface AttributeFormLocaleControlsContextValue {
  readonly activeLocale: ProductAttribute["localeCode"]
  readonly clearLocaleSubmitError: () => void
  readonly focusIncompleteLocales: (locales: readonly ProductAttribute["localeCode"][]) => void
  readonly incompleteLocales: readonly ProductAttribute["localeCode"][]
  readonly localeSubmitError: boolean
  readonly setActiveLocale: (locale: ProductAttribute["localeCode"]) => void
}

const AttributeFormLocaleControlsContext = createContext<AttributeFormLocaleControlsContextValue | undefined>(undefined)

export const AttributeFormLocaleControlsProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const [activeLocale, setActiveLocale] = useState<ProductAttribute["localeCode"]>(I18N.DEFAULT_LOCALE)
  const [incompleteLocales, setIncompleteLocales] = useState<readonly ProductAttribute["localeCode"][]>([])
  const [localeSubmitError, setLocaleSubmitError] = useState(false)

  const clearLocaleSubmitError = useCallback(() => {
    setIncompleteLocales([])
    setLocaleSubmitError(false)
  }, [])

  const focusIncompleteLocales = useCallback((locales: readonly ProductAttribute["localeCode"][]) => {
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
