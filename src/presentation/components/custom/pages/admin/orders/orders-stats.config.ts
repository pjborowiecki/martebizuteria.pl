import { CircleDollarSign, Clock, type LucideIcon, Package, ShoppingBag } from "lucide-react"

import { ADMIN_ORDER_STAT_FILTER } from "~/src/modules/order/order.constants"

export type OrderStatKey = "avgValueMinorUnits" | "pending" | "revenueMinorUnits" | "totalOrders"

export interface OrderStatCardConfig {
  readonly filter?: (typeof ADMIN_ORDER_STAT_FILTER)[keyof typeof ADMIN_ORDER_STAT_FILTER]
  readonly gradient: string
  readonly icon: LucideIcon
  readonly key: OrderStatKey
}

export const ORDER_STAT_CARDS: readonly OrderStatCardConfig[] = [
  {
    filter: ADMIN_ORDER_STAT_FILTER.TOTAL,
    gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
    icon: ShoppingBag,
    key: "totalOrders",
  },
  {
    filter: ADMIN_ORDER_STAT_FILTER.PENDING,
    gradient: "from-amber-500/20 via-orange-500/6 to-transparent",
    icon: Clock,
    key: "pending",
  },
  {
    gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent",
    icon: CircleDollarSign,
    key: "revenueMinorUnits",
  },
  {
    gradient: "from-sky-500/20 via-blue-500/6 to-transparent",
    icon: Package,
    key: "avgValueMinorUnits",
  },
]
