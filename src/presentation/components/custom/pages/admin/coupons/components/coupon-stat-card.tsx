import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CARD_CONTENT_CLASS,
  ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
  ADMIN_STAT_ICON_CLASS,
  ADMIN_STAT_LABEL_CLASS,
  ADMIN_STAT_VALUE_SLOT_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AdminStatValue } from "~/src/presentation/components/custom/pages/admin/admin-stat-value"
import { type CouponStatCardConfig } from "~/src/presentation/components/custom/pages/admin/coupons/coupons-stats.config"

export const CouponStatCard = ({ config, displayValue, onFilter, pressed, valuesPending }: Readonly<CouponStatCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.stats")
  const { gradient, icon: Icon, labelKey } = config
  const cardClassName = cn(
    "h-full gap-0 py-0",
    ADMIN_CARD_CLASS,
    "bg-gradient-to-br from-transparent",
    gradient,
    onFilter !== undefined && !valuesPending && ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
    onFilter !== undefined && pressed && ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  )

  const content = (
    <CardContent className={ADMIN_STAT_CARD_CONTENT_CLASS}>
      <div className="min-w-0 flex-1 space-y-2">
        <p className={ADMIN_STAT_LABEL_CLASS}>{t(labelKey)}</p>
        <div className={ADMIN_STAT_VALUE_SLOT_CLASS}>
          {valuesPending ? <Skeleton className="h-8 w-20" /> : <AdminStatValue value={displayValue} />}
        </div>
      </div>
      <div className={ADMIN_STAT_ICON_CLASS}>
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
    </CardContent>
  )

  if (onFilter === undefined) {
    return <Card className={cardClassName}>{content}</Card>
  }

  return (
    <Card className={cardClassName}>
      <button
        aria-busy={valuesPending}
        aria-pressed={pressed}
        className="block h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left shadow-none outline-none focus:outline-none focus-visible:outline-none disabled:cursor-default"
        disabled={valuesPending}
        onClick={onFilter}
        type="button"
      >
        {content}
      </button>
    </Card>
  )
}

interface CouponStatCardProps {
  readonly config: CouponStatCardConfig
  readonly displayValue: string
  readonly onFilter?: (() => void) | undefined
  readonly pressed: boolean
  readonly valuesPending: boolean
}
