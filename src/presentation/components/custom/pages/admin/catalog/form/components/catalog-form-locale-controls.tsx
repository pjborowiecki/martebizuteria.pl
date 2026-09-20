import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"
export const CatalogFormLocaleControlsProvider = ({
  children,
}: Readonly<{
  children: ReactNode
}>): JSX.Element => {
  const [activeLocale, setActiveLocale] = useState<Locale>(DEFAULT_LOCALE)
  const [incompleteLocales, setIncompleteLocales] = useState<readonly Locale[]>([])
  const [localeSubmitError, setLocaleSubmitError] = useState(false)
  const clearLocaleSubmitError = useCallback(() => {
    setIncompleteLocales([])
    setLocaleSubmitError(false)
  }, [])
  const focusIncompleteLocales = useCallback((locales: readonly Locale[]) => {
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
  return <CatalogFormLocaleControlsContext.Provider value={value}>{children}</CatalogFormLocaleControlsContext.Provider>
}
export const useCatalogFormLocaleControls = (): CatalogFormLocaleControlsContextValue => {
  const context = useContext(CatalogFormLocaleControlsContext)
  if (context === undefined) {
    throw new Error("useCatalogFormLocaleControls must be used within CatalogFormLocaleControlsProvider")
  }
  return context
}
export const formatCatalogLocaleList = (
  locales: readonly Locale[],
  formatLocale: (locale: Locale) => string = (locale) => locale.toUpperCase(),
): string => locales.map((locale) => formatLocale(locale)).join(", ")

interface CatalogFormLocaleControlsContextValue {
  readonly activeLocale: Locale
  readonly clearLocaleSubmitError: () => void
  readonly focusIncompleteLocales: (locales: readonly Locale[]) => void
  readonly incompleteLocales: readonly Locale[]
  readonly localeSubmitError: boolean
  readonly setActiveLocale: (locale: Locale) => void
}
const CatalogFormLocaleControlsContext = createContext<CatalogFormLocaleControlsContextValue | undefined>(undefined)
