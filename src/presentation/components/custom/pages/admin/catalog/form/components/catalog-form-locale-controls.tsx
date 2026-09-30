import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export const CatalogFormLocaleControlsProvider = ({
  children,
}: Readonly<{
  children: ReactNode
}>): JSX.Element => {
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(I18N.DEFAULT_LOCALE)
  const [incompleteLocales, setIncompleteLocales] = useState<readonly SupportedLocale[]>([])
  const [localeSubmitError, setLocaleSubmitError] = useState(false)
  const clearLocaleSubmitError = useCallback(() => {
    setIncompleteLocales([])
    setLocaleSubmitError(false)
  }, [])

  const focusIncompleteLocales = useCallback((locales: readonly SupportedLocale[]) => {
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
  locales: readonly SupportedLocale[],
  formatLocale: (locale: SupportedLocale) => string = (locale) => locale.toUpperCase(),
): string => locales.map((locale) => formatLocale(locale)).join(", ")

interface CatalogFormLocaleControlsContextValue {
  readonly activeLocale: SupportedLocale
  readonly clearLocaleSubmitError: () => void
  readonly focusIncompleteLocales: (locales: readonly SupportedLocale[]) => void
  readonly incompleteLocales: readonly SupportedLocale[]
  readonly localeSubmitError: boolean
  readonly setActiveLocale: (locale: SupportedLocale) => void
}

const CatalogFormLocaleControlsContext = createContext<CatalogFormLocaleControlsContextValue | undefined>(undefined)
