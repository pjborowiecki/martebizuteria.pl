import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { STORE_INFO_DEFAULTS } from "~/src/data/settings-data"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
export const StoreInfoCard = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  return (
    <Card className="border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">{t("settings.general.storeInfo.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("settings.general.storeInfo.description")}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium">{t("settings.general.storeInfo.name")}</span>
          <input
            aria-label={t("settings.general.storeInfo.name")}
            className="block h-10 w-full rounded-lg border border-border/50 bg-background px-4 text-sm transition-colors focus:border-border focus:outline-none"
            defaultValue={STORE_INFO_DEFAULTS.name}
            type="text"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">{t("settings.general.storeInfo.email")}</span>
          <input
            aria-label={t("settings.general.storeInfo.email")}
            className="block h-10 w-full rounded-lg border border-border/50 bg-background px-4 text-sm transition-colors focus:border-border focus:outline-none"
            defaultValue={STORE_INFO_DEFAULTS.email}
            type="email"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">{t("settings.general.storeInfo.desc")}</span>
          <textarea
            aria-label={t("settings.general.storeInfo.desc")}
            className="block w-full resize-none rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm transition-colors focus:border-border focus:outline-none"
            defaultValue={STORE_INFO_DEFAULTS.description}
            rows={3}
          />
        </label>
        <div className="flex justify-end">
          <Button className="h-9 px-6 text-sm" size="sm">
            {t("settings.general.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
