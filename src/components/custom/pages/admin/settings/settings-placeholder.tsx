import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";

import { type SettingsTab, SETTINGS_TAB_DEFINITIONS } from "~/src/data/settings-data";

interface SettingsPlaceholderProps {
  readonly activeTab: SettingsTab;
}

export function SettingsPlaceholder({ activeTab }: SettingsPlaceholderProps): JSX.Element {
  const t = useTranslations("admin");

  const tabDef = SETTINGS_TAB_DEFINITIONS.find((tab) => tab.key === activeTab);

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
  );
}
