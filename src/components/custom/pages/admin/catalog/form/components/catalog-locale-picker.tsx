import { createContext, type JSX, type ReactNode, useCallback, useContext, useMemo } from "react";

import { useTranslations } from "use-intl";

import { DEFAULT_LOCALE, LOCALES } from "~/src/constants/_constants/locales";
import type { Locale } from "~/src/constants/types";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

const ZERO_LENGTH = 0;
const EMPTY_INCOMPLETE_LOCALES: readonly Locale[] = [];

function parseLocaleCode(value: string | null): Locale {
  if (value === "pl" || value === "en") {
    return value;
  }

  return DEFAULT_LOCALE;
}

interface CatalogLocalePickerContextValue {
  readonly activeLocale: Locale;
}

const CatalogLocalePickerContext = createContext<CatalogLocalePickerContextValue | undefined>(undefined);

export function CatalogLocalePickerProvider({
  activeLocale,
  children
}: Readonly<{
  activeLocale: Locale;
  children: ReactNode;
}>): JSX.Element {
  const value = useMemo(() => ({ activeLocale }), [activeLocale]);

  return <CatalogLocalePickerContext.Provider value={value}>{children}</CatalogLocalePickerContext.Provider>;
}

export function useCatalogActiveLocale(): Locale {
  const context = useContext(CatalogLocalePickerContext);

  if (context === undefined) {
    throw new Error("useCatalogActiveLocale must be used within CatalogLocalePickerProvider");
  }

  return context.activeLocale;
}

interface CatalogLocalePickerBarProps {
  readonly filledCountHint: string;
  readonly fills: Record<Locale, boolean>;
  readonly incompleteLocales?: readonly Locale[];
  readonly onLocaleChange: (locale: Locale) => void;
  readonly showSubmitError?: boolean;
  readonly value: Locale;
}

export function CatalogLocalePickerBar({
  filledCountHint,
  fills,
  incompleteLocales = EMPTY_INCOMPLETE_LOCALES,
  onLocaleChange,
  showSubmitError = false,
  value
}: Readonly<CatalogLocalePickerBarProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.localePicker");
  const filledCount = LOCALES.filter((locale) => fills[locale]).length;
  const localeItems = useMemo(() => LOCALES.map((locale) => ({ label: locale.toUpperCase(), value: locale })), []);

  const handleValueChange = useCallback(
    (next: string | null) => {
      onLocaleChange(parseLocaleCode(next));
    },
    [onLocaleChange]
  );

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
          {t("filledCount", { filled: filledCount, total: LOCALES.length })}
          <span className="text-muted-foreground"> · {filledCountHint}</span>
        </span>
      </div>
      {showSubmitError && incompleteLocales.length > ZERO_LENGTH && (
        <p className="text-sm text-destructive" role="alert">
          {t("incompleteHint", { locales: incompleteLocales.map((locale) => locale.toUpperCase()).join(", ") })}
        </p>
      )}
    </div>
  );
}

interface CatalogLocalePickerLayoutProps {
  readonly activeLocale: Locale;
  readonly children: ReactNode;
  readonly filledCountHint: string;
  readonly fills: Record<Locale, boolean>;
  readonly incompleteLocales?: readonly Locale[];
  readonly onLocaleChange: (locale: Locale) => void;
  readonly showSubmitError?: boolean;
}

/** Locale dropdown above form sections; children edit the active locale only. */
export function CatalogLocalePickerLayout({
  activeLocale,
  children,
  filledCountHint,
  fills,
  incompleteLocales,
  onLocaleChange,
  showSubmitError
}: Readonly<CatalogLocalePickerLayoutProps>): JSX.Element {
  return (
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
  );
}
