import { type JSX, type ReactNode, createContext, useCallback, useContext, useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

const parseLocaleCode = (value: string | null): SupportedLocale => {
  if (value !== null && isSupportedLocale(value)) {
    return value
  }

  return I18N.DEFAULT_LOCALE
}

export const CatalogLocalePickerProvider = ({
  activeLocale,
  children,
}: Readonly<{
  activeLocale: SupportedLocale
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

export const useCatalogActiveLocale = (): SupportedLocale => {
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
  const filledCount = I18N.SUPPORTED_LOCALES.filter((locale) => fills[locale]).length
  const localeItems = useMemo(
    () =>
      I18N.SUPPORTED_LOCALES.map((locale) => ({
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
            {I18N.SUPPORTED_LOCALES.map((locale) => (
              <SelectItem key={locale} className="uppercase" showIndicator={false} value={locale}>
                {locale.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className={`text-xs ${showSubmitError ? "text-destructive" : "text-muted-foreground"}`} id="catalog-locale-picker-progress">
          {t("filledCount", {
            filled: filledCount,
            total: I18N.SUPPORTED_LOCALES.length,
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

const EMPTY_INCOMPLETE_LOCALES: readonly SupportedLocale[] = []

interface CatalogLocalePickerContextValue {
  readonly activeLocale: SupportedLocale
}

const CatalogLocalePickerContext = createContext<CatalogLocalePickerContextValue | undefined>(undefined)

interface CatalogLocalePickerBarProps {
  readonly filledCountHint: string
  readonly fills: Record<SupportedLocale, boolean>
  readonly incompleteLocales?: readonly SupportedLocale[] | undefined
  readonly onLocaleChange: (locale: SupportedLocale) => void
  readonly showSubmitError?: boolean | undefined
  readonly value: SupportedLocale
}

interface CatalogLocalePickerLayoutProps {
  readonly activeLocale: SupportedLocale
  readonly children: ReactNode
  readonly filledCountHint: string
  readonly fills: Record<SupportedLocale, boolean>
  readonly incompleteLocales?: readonly SupportedLocale[]
  readonly onLocaleChange: (locale: SupportedLocale) => void
  readonly showSubmitError?: boolean
}
