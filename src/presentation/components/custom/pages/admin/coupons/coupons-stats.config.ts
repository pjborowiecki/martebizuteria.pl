import { BadgePercent, type LucideIcon, Tag, TicketCheck, Wallet } from "lucide-react"

import { DISCOUNT_STATUS, type DiscountStatus } from "~/src/modules/discount/discount.constants"

export type CouponStatKey = "active" | "redeemedTotalMinorUnits" | "redemptions" | "total"

export interface CouponStatCardConfig {
  readonly filter?: { readonly status: DiscountStatus | undefined }
  readonly gradient: string
  readonly icon: LucideIcon
  readonly key: CouponStatKey
  readonly labelKey: "activeCoupons" | "revenueGivenAway" | "totalCoupons" | "totalRedemptions"
}

export const COUPON_STAT_CARDS: readonly CouponStatCardConfig[] = [
  {
    filter: { status: undefined },
    gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
    icon: Tag,
    key: "total",
    labelKey: "totalCoupons",
  },
  {
    filter: { status: DISCOUNT_STATUS.ACTIVE },
    gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent",
    icon: BadgePercent,
    key: "active",
    labelKey: "activeCoupons",
  },
  {
    gradient: "from-sky-500/20 via-blue-500/6 to-transparent",
    icon: TicketCheck,
    key: "redemptions",
    labelKey: "totalRedemptions",
  },
  {
    gradient: "from-amber-500/20 via-amber-500/6 to-transparent",
    icon: Wallet,
    key: "redeemedTotalMinorUnits",
    labelKey: "revenueGivenAway",
  },
]
