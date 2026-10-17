import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"

const TEAM_RULES = ["verified", "self", "recentSignIn", "signOut", "deletion", "audit"] as const

export const SettingsTeamRulesCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.rules")

  return (
    <SettingsCard description={t("description")} title={t("title")}>
      <ul className="list-disc space-y-1.5 py-4 pr-4 pl-9 text-[13px] leading-relaxed text-muted-foreground lg:pr-5 lg:pl-10">
        {TEAM_RULES.map((rule) => (
          <li key={rule}>{t(rule)}</li>
        ))}
      </ul>
    </SettingsCard>
  )
}
