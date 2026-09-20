import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { type ToggleSettingKey } from "~/src/data/settings-data"

import { Switch } from "~/src/presentation/components/shadcn/switch"
export const PreferenceToggle = ({ settingKey }: PreferenceToggleProps): JSX.Element => {
  const t = useTranslations("pages.admin")
  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{t(`settings.general.preferences.${settingKey}.label`)}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{t(`settings.general.preferences.${settingKey}.description`)}</p>
      </div>
      <Switch />
    </div>
  )
}
interface PreferenceToggleProps {
  readonly settingKey: ToggleSettingKey
}
