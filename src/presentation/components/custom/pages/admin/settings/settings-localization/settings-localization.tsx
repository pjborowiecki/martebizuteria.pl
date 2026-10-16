import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { DisplayPreferenceField } from "~/src/presentation/components/custom/display-preferences/display-preference-field"
import { useDisplayPreferenceOptions } from "~/src/presentation/components/custom/display-preferences/use-display-preference-options"

const FIELD_CLASS = "space-y-2"

const LABEL_CLASS = "text-sm font-medium"

const TRIGGER_CLASS = "w-full"

export const SettingsLocalization = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const tPreferences = useTranslations("components.custom.displayPreferences")
  const options = useDisplayPreferenceOptions()

  return (
    <div className="min-w-0 flex-1 space-y-6">
      <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">{t("settings.localization.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("settings.localization.description")}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <DisplayPreferenceField
            choice={options.timeZone}
            className={FIELD_CLASS}
            label={tPreferences("timeZone")}
            labelClassName={LABEL_CLASS}
            preference="timeZone"
            triggerClassName={TRIGGER_CLASS}
          />
          <DisplayPreferenceField
            choice={options.formatLocale}
            className={FIELD_CLASS}
            label={tPreferences("formatLocale")}
            labelClassName={LABEL_CLASS}
            preference="formatLocale"
            triggerClassName={TRIGGER_CLASS}
          />
        </CardContent>
      </Card>
    </div>
  )
}
