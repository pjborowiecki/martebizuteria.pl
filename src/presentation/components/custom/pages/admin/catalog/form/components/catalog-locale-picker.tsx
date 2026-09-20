import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo } from "react"

import { useTranslations } from "use-intl"

import { DEFAULT_LOCALE, LOCALES } from "~/src/integrations/use-intl/i18n.config"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
const parseLocaleCode = (value: string | null): Locale => {
  if (value === "pl" || value === "en") {
    return value
  }
  return DEFAULT_LOCALE
}
export const CatalogLocalePickerProvider = ({
  activeLocale,
  children,
}: Readonly<{
  activeLocale: Locale
  children: ReactNode
}>): JSX.Element => {
  const value = useMemo(
    () => ({
      activeLocale,
    }),
    [activeLocale],
  )
  return <CatalogLocalePickerContext.Provider value={value}>{children}</CatalogLocalePickerContext.Provider>
}
export const useCatalogActiveLocale = (): Locale => {
  const context = useContext(CatalogLocalePickerContext)
  if (context === undefined) {
    throw new Error("useCatalogActiveLocale must be used within CatalogLocalePickerProvider")
  }
  return context.activeLocale
}
export const CatalogLocalePickerBar = ({
  filledCountHint,
  fills,
  incompleteLocales = EMPTY_INCOMPLETE_LOCALES,
  onLocaleChange,
  showSubmitError = false,
  value,
}: Readonly<CatalogLocalePickerBarProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.localePicker")
  const filledCount = LOCALES.filter((locale) => fills[locale]).length
  const localeItems = useMemo(
    () =>
      LOCALES.map((locale) => ({
        label: locale.toUpperCase(),
        value: locale,
      })),
    [],
  )
  const handleValueChange = useCallback(
    (next: string | null) => {
      onLocaleChange(parseLocaleCode(next))
    },
    [onLocaleChange],
  )
  return (
    <div className="space-y-2 border-b border-border pb-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm font-medium text-foreground">{t("label")}</span>
        <Select items={localeItems} onValueChange={handleValueChange} value={value}>
          <SelectTrigger
            aria-describedby="catalog-locale-picker-progress"
            aria-invalid={showSubmitError}
            aria-label={t("label")}
            className="w-[min(100%,12rem)] uppercase"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALES.map((locale) => (
              <SelectItem key={locale} className="uppercase" showIndicator={false} value={locale}>
                {locale.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className={`text-xs ${showSubmitError ? "text-destructive" : "text-muted-foreground"}`} id="catalog-locale-picker-progress">
          {t("filledCount", {
            filled: filledCount,
            total: LOCALES.length,
          })}
          <span className="text-muted-foreground"> · {filledCountHint}</span>
        </span>
      </div>
      {showSubmitError && incompleteLocales.length > 0 && (
        <p className="text-sm text-destructive" role="alert">
          {t("incompleteHint", {
            locales: incompleteLocales.map((locale) => locale.toUpperCase()).join(", "),
          })}
        </p>
      )}
    </div>
  )
}

export const CatalogLocalePickerLayout = ({
  activeLocale,
  children,
  filledCountHint,
  fills,
  incompleteLocales,
  onLocaleChange,
  showSubmitError,
}: Readonly<CatalogLocalePickerLayoutProps>): JSX.Element => (
  <CatalogLocalePickerProvider activeLocale={activeLocale}>
    <div className="space-y-6">
      <CatalogLocalePickerBar
        filledCountHint={filledCountHint}
        fills={fills}
        incompleteLocales={incompleteLocales}
        onLocaleChange={onLocaleChange}
        showSubmitError={showSubmitError}
        value={activeLocale}
      />
      {children}
    </div>
  </CatalogLocalePickerProvider>
)

const EMPTY_INCOMPLETE_LOCALES: readonly Locale[] = []
interface CatalogLocalePickerContextValue {
  readonly activeLocale: Locale
}
const CatalogLocalePickerContext = createContext<CatalogLocalePickerContextValue | undefined>(undefined)
interface CatalogLocalePickerBarProps {
  readonly filledCountHint: string
  readonly fills: Record<Locale, boolean>
  readonly incompleteLocales?: readonly Locale[] | undefined
  readonly onLocaleChange: (locale: Locale) => void
  readonly showSubmitError?: boolean | undefined
  readonly value: Locale
}
interface CatalogLocalePickerLayoutProps {
  readonly activeLocale: Locale
  readonly children: ReactNode
  readonly filledCountHint: string
  readonly fills: Record<Locale, boolean>
  readonly incompleteLocales?: readonly Locale[]
  readonly onLocaleChange: (locale: Locale) => void
  readonly showSubmitError?: boolean
}
