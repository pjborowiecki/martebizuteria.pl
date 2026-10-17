import { Archive, CheckCircle2, EyeOff, Gift } from "lucide-react"

import { DELIVERY_METHOD_STATUS, type DeliveryMethodStatus } from "~/src/modules/delivery-method/delivery-method.constants"

import { type SettingsStatCardConfig } from "~/src/presentation/components/custom/pages/admin/settings/settings-stat-card"

export const DELIVERY_METHOD_STAT_CARDS: readonly DeliveryMethodStatCardConfig[] = [
  { gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent", icon: CheckCircle2, status: DELIVERY_METHOD_STATUS.OFFERED },
  { gradient: "from-amber-500/20 via-amber-500/6 to-transparent", icon: EyeOff, status: DELIVERY_METHOD_STATUS.HIDDEN },
  { gradient: "from-zinc-500/15 via-zinc-500/5 to-transparent", icon: Archive, status: DELIVERY_METHOD_STATUS.ARCHIVED },
]

export const FREE_DELIVERY_STAT_CARD: SettingsStatCardConfig = {
  gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
  icon: Gift,
}

interface DeliveryMethodStatCardConfig extends SettingsStatCardConfig {
  readonly status: DeliveryMethodStatus
}
