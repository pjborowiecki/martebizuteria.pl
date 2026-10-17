import { ShieldAlert, ShieldCheck, UserCog, UsersRound } from "lucide-react"

import { TEAM_STAT_FILTER, type TeamStatFilter } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { type SettingsStatCardConfig } from "~/src/presentation/components/custom/pages/admin/settings/settings-stat-card"

export const matchesTeamStatFilter = (member: User["adminTeamMember"], filter: TeamStatFilter | undefined): boolean => {
  if (filter === TEAM_STAT_FILTER.TWO_FACTOR_ON) {
    return member.twoFactorEnabled
  }

  if (filter === TEAM_STAT_FILTER.TWO_FACTOR_OFF) {
    return !member.twoFactorEnabled
  }

  return filter === undefined || member.hasGoogle
}

export const TEAM_STAT_CARDS: readonly TeamStatCardConfig[] = [
  { filter: undefined, gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent", icon: UsersRound, key: "total" },
  {
    filter: TEAM_STAT_FILTER.TWO_FACTOR_ON,
    gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent",
    icon: ShieldCheck,
    key: "twoFactorOn",
  },
  {
    filter: TEAM_STAT_FILTER.TWO_FACTOR_OFF,
    gradient: "from-amber-500/20 via-amber-500/6 to-transparent",
    icon: ShieldAlert,
    key: "twoFactorOff",
  },
  { filter: TEAM_STAT_FILTER.GOOGLE, gradient: "from-sky-500/20 via-blue-500/6 to-transparent", icon: UserCog, key: "google" },
]

interface TeamStatCardConfig extends SettingsStatCardConfig {
  readonly filter: TeamStatFilter | undefined
  readonly key: "google" | "total" | "twoFactorOff" | "twoFactorOn"
}
