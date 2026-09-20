import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { SETTINGS_TAB_DEFINITIONS, type SettingsTab } from "~/src/data/settings-data"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
export const SettingsPlaceholder = ({ activeTab }: SettingsPlaceholderProps): JSX.Element => {
  const t = useTranslations("pages.admin")
  const tabDef = SETTINGS_TAB_DEFINITIONS.find((tab) => tab.key === activeTab)
  return (
    <div className="min-w-0 flex-1">
      <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
            {tabDef !== undefined && <tabDef.icon className="size-6 text-muted-foreground" strokeWidth={1.5} />}
          </div>
          <p className="mt-4 text-sm font-medium">{t(`settings.tabs.${activeTab}`)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.comingSoon")}</p>
        </CardContent>
      </Card>
    </div>
  )
}
interface SettingsPlaceholderProps {
  readonly activeTab: SettingsTab
}
