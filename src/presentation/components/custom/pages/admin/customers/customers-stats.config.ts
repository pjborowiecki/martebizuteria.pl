import { type LucideIcon, Package, Repeat2, TrendingUp, Users } from "lucide-react"

import { ADMIN_CUSTOMER_STAT_FILTER } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

export type CustomerStatKey = keyof User["adminCustomerStats"]

export interface CustomerStatCardConfig {
  readonly filter?: (typeof ADMIN_CUSTOMER_STAT_FILTER)[keyof typeof ADMIN_CUSTOMER_STAT_FILTER]
  readonly gradient: string
  readonly icon: LucideIcon
  readonly key: CustomerStatKey
}

export const CUSTOMER_STAT_CARDS: readonly CustomerStatCardConfig[] = [
  {
    filter: ADMIN_CUSTOMER_STAT_FILTER.TOTAL,
    gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
    icon: Users,
    key: "total",
  },
  {
    filter: ADMIN_CUSTOMER_STAT_FILTER.RETURNING,
    gradient: "from-sky-500/20 via-blue-500/6 to-transparent",
    icon: Repeat2,
    key: "returningRate",
  },
  {
    gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent",
    icon: TrendingUp,
    key: "averageLtv",
  },
  {
    gradient: "from-amber-500/20 via-amber-500/6 to-transparent",
    icon: Package,
    key: "averageProductsPerOrder",
  },
]
