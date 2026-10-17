import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { isAdminTwoFactorRequired } from "~/src/integrations/better-auth/auth.access"

import { listAdminTeamQuery } from "~/src/modules/user/use-cases/list-admin-team"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { ADMIN_STAT_GRID_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { SettingsStatCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-stat-card"
import { useTeamDataGridContext } from "~/src/presentation/components/custom/pages/admin/settings/team/hooks/use-team-data-grid"
import { TEAM_STAT_CARDS, matchesTeamStatFilter } from "~/src/presentation/components/custom/pages/admin/settings/team/team-stats.config"

const PERCENT_SCALE = 100

export const TeamStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.stats")
  const formatLocale = useFormatLocale()
  const { data, isFetching, isStale } = useSuspenseQuery(listAdminTeamQuery())
  const { activeStatFilter, applyStatFilter } = useTeamDataGridContext()
  const total = data.members.length

  return (
    <div className={ADMIN_STAT_GRID_CLASS}>
      {TEAM_STAT_CARDS.map((config) => {
        const count = data.members.filter((member) => matchesTeamStatFilter(member, config.filter)).length
        const pressed = config.filter === activeStatFilter
        const caption =
          config.key === "twoFactorOff" && isAdminTwoFactorRequired() && count > 0
            ? t("twoFactorRequiredCaption")
            : t("shareCaption", { percent: total === 0 ? 0 : Math.round((count / total) * PERCENT_SCALE) })

        return (
          <SettingsStatCard
            caption={config.key === "total" ? undefined : caption}
            config={config}
            key={config.key}
            label={t(config.key)}
            onFilter={() => {
              applyStatFilter(pressed || config.filter === undefined ? undefined : config.filter)
            }}
            pressed={pressed}
            value={count.toLocaleString(formatLocale)}
            valuesPending={isFetching && isStale}
          />
        )
      })}
    </div>
  )
}
