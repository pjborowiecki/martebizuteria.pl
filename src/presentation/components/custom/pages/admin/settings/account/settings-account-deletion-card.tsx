import { type JSX } from "react"

import { cn } from "cn"
import { UsersRound } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { buttonVariants } from "~/src/presentation/components/shadcn/button"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"

import { ROUTES } from "~/src/routes"

export const SettingsAccountDeletionCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.account.deletion")

  return (
    <SettingsCard
      action={
        <LocalizedLink
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "shrink-0 gap-1.5 self-start")}
          to={ROUTES.ADMIN_SETTINGS_TEAM}
        >
          <UsersRound className="size-3.5" strokeWidth={1.5} />
          {t("team")}
        </LocalizedLink>
      }
      description={t("description")}
      title={t("title")}
    >
      <p className="px-4 py-4 text-[13px] leading-relaxed text-muted-foreground lg:px-5">{t("howTo")}</p>
    </SettingsCard>
  )
}
