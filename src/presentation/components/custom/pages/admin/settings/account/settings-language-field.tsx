import { type JSX, useCallback, useId, useMemo } from "react"

import { useLocale, useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale, localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { sheetSelectTriggerClassName } from "~/src/presentation/components/shadcn/_styles/sheet-control.styles"
import { Label } from "~/src/presentation/components/shadcn/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { ADMIN_DIALOG_LABEL_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"

export const SettingsLanguageField = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.account.preferences")
  const locale = useLocale()
  const fieldId = useId()
  const items = useMemo(() => I18N.SUPPORTED_LOCALES.map((value) => ({ label: t(`languages.${value}`), value })), [t])

  const switchLanguage = useCallback(
    (next: string | null) => {
      if (next === null || !isSupportedLocale(next) || next === locale) {
        return
      }
      globalThis.location.assign(
        `${localizePathname({ locale: next, pathname: globalThis.location.pathname })}${globalThis.location.search}`,
      )
    },
    [locale],
  )

  return (
    <div className="space-y-2">
      <Label className={ADMIN_DIALOG_LABEL_CLASS} htmlFor={fieldId}>
        {t("language")}
      </Label>
      <Select items={items} onValueChange={switchLanguage} value={locale}>
        <SelectTrigger className={sheetSelectTriggerClassName} id={fieldId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
