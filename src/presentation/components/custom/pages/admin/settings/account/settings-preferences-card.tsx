import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { sheetSelectTriggerClassName } from "~/src/presentation/components/shadcn/_styles/sheet-control.styles"

import { DisplayPreferenceField } from "~/src/presentation/components/custom/display-preferences/display-preference-field"
import { useDisplayPreferenceOptions } from "~/src/presentation/components/custom/display-preferences/use-display-preference-options"
import { ADMIN_DIALOG_LABEL_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { SettingsLanguageField } from "~/src/presentation/components/custom/pages/admin/settings/account/settings-language-field"
import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"

export const SettingsPreferencesCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.account.preferences")
  const tPreferences = useTranslations("components.custom.displayPreferences")
  const options = useDisplayPreferenceOptions()

  return (
    <SettingsCard description={t("description")} title={t("title")}>
      <div className="grid gap-5 px-4 py-5 md:grid-cols-2 lg:px-5">
        <SettingsLanguageField />
        <DisplayPreferenceField
          choice={options.timeZone}
          className="space-y-2"
          label={tPreferences("timeZone")}
          labelClassName={ADMIN_DIALOG_LABEL_CLASS}
          preference="timeZone"
          triggerClassName={sheetSelectTriggerClassName}
        />
        <DisplayPreferenceField
          choice={options.formatLocale}
          className="space-y-2"
          label={tPreferences("formatLocale")}
          labelClassName={ADMIN_DIALOG_LABEL_CLASS}
          preference="formatLocale"
          triggerClassName={sheetSelectTriggerClassName}
        />
      </div>
    </SettingsCard>
  )
}
