import { type JSX, type ReactNode } from "react"

import { useTranslations } from "use-intl/react"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

export const ContentPageLocaleTabs = ({
  children,
  invalidLocales,
  locale,
  onLocaleChange,
}: Readonly<ContentPageLocaleTabsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.content.editor")
  const changeLocale = (value: unknown): void => {
    if (typeof value === "string" && isSupportedLocale(value)) {
      onLocaleChange(value)
    }
  }

  return (
    <Tabs onValueChange={changeLocale} value={locale}>
      <TabsList aria-label={t("language")} variant="line">
        {I18N.SUPPORTED_LOCALES.map((code) => (
          <TabsTrigger key={code} className="px-3 text-[13px]" value={code}>
            {t(`localeNames.${code}`)}
            {invalidLocales.includes(code) && (
              <>
                <span aria-hidden="true" className="size-1.5 rounded-full bg-destructive" />
                <span className="sr-only">{`, ${t("localeHasErrors")}`}</span>
              </>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent className="pt-8" value={locale}>
        {children}
      </TabsContent>
    </Tabs>
  )
}

interface ContentPageLocaleTabsProps {
  readonly children: ReactNode
  readonly invalidLocales: readonly SupportedLocale[]
  readonly locale: SupportedLocale
  readonly onLocaleChange: (locale: SupportedLocale) => void
}
