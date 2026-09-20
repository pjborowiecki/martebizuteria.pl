import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { TOGGLE_SETTING_KEYS } from "~/src/data/settings-data"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { PreferenceToggle } from "~/src/presentation/components/custom/pages/admin/settings/settings-general/preference-toggle"
export const PreferencesCard = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">{t("settings.general.preferences.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("settings.general.preferences.description")}</p>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-border/40">
        {TOGGLE_SETTING_KEYS.map((key) => (
          <PreferenceToggle key={key} settingKey={key} />
        ))}
      </CardContent>
    </Card>
  )
}
