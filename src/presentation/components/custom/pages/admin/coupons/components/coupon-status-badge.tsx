import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { type DiscountStatus } from "~/src/modules/discount/discount.constants"

import { Badge } from "~/src/presentation/components/shadcn/badge"

export const CouponStatusBadge = ({ status }: Readonly<{ status: DiscountStatus }>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.status")

  return (
    <Badge className={cn("h-5 border-0 px-2 py-0.5 text-[11px] font-medium", COUPON_STATUS_BADGE_CLASS[status])} variant="outline">
      {t(status)}
    </Badge>
  )
}

const COUPON_STATUS_BADGE_CLASS: Record<DiscountStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  disabled: "bg-muted text-muted-foreground",
  exhausted: "bg-muted text-muted-foreground",
  expired: "bg-red-500/10 text-red-600 dark:text-red-400",
  scheduled: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
}
