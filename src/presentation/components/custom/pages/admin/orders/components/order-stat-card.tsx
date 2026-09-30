import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { ADMIN_ORDER_STAT_FILTER, type AdminOrderStatFilter } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CAPTION_SLOT_CLASS,
  ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
  ADMIN_STAT_LABEL_CLASS,
  ADMIN_STAT_VALUE_CLASS,
  ADMIN_STAT_VALUE_SLOT_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AdminStatCaption } from "~/src/presentation/components/custom/pages/admin/admin-stat-caption"
import { type OrderStatCardConfig, type OrderStatKey } from "~/src/presentation/components/custom/pages/admin/orders/orders-stats.config"

export const OrderStatCard = ({
  activeFilter,
  caption,
  config,
  currencyCode: _currencyCode,
  displayValue,
  onFilter,
  valuesPending,
}: Readonly<OrderStatCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orders")
  const { filter, gradient, icon: Icon, key } = config
  const isTotalCard = key === "totalOrders"
  const isFilterable = onFilter !== undefined && (isTotalCard || filter !== undefined)
  let isActive = false
  if (isTotalCard) {
    isActive = activeFilter === undefined || activeFilter === ADMIN_ORDER_STAT_FILTER.TOTAL
  } else if (filter !== undefined) {
    isActive = activeFilter === filter
  }

  const cardClassName = cn(
    "h-full gap-0 py-0",
    ADMIN_CARD_CLASS,
    "bg-gradient-to-br from-transparent",
    gradient,
    isFilterable && !valuesPending && ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
    isFilterable && isActive && ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  )

  const content = (
    <CardContent className="flex h-full items-start justify-between gap-4 p-5">
      <div className="min-w-0 flex-1 space-y-2">
        <p className={ADMIN_STAT_LABEL_CLASS}>{t(`stats.${key}.label`)}</p>
        <div className={ADMIN_STAT_VALUE_SLOT_CLASS}>
          {valuesPending ? <Skeleton className="h-8 w-20" /> : <p className={ADMIN_STAT_VALUE_CLASS}>{displayValue}</p>}
        </div>
        <div className={ADMIN_STAT_CAPTION_SLOT_CLASS}>
          <AdminStatCaption caption={caption} valuesPending={valuesPending} />
        </div>
      </div>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary shadow-none">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
    </CardContent>
  )

  if (onFilter === undefined || (!isTotalCard && filter === undefined)) {
    return <Card className={cardClassName}>{content}</Card>
  }

  const handleFilterClick = (): void => {
    if (isTotalCard) {
      onFilter()

      return
    }
    onFilter(isActive ? undefined : filter)
  }

  return (
    <Card className={cardClassName}>
      <button
        type="button"
        aria-pressed={isActive}
        aria-busy={valuesPending}
        disabled={valuesPending}
        className="block h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left shadow-none outline-none focus:outline-none focus-visible:outline-none disabled:cursor-default"
        onClick={handleFilterClick}
      >
        {content}
      </button>
    </Card>
  )
}

export const formatOrderStatDisplayValue = ({
  currencyCode,
  key,
  locale,
  value,
}: Readonly<{
  currencyCode: string
  key: OrderStatKey
  locale: string
  value: number
}>): string => {
  if (key === "revenueMinorUnits" || key === "avgValueMinorUnits") {
    return formatPrice(value, currencyCode, locale)
  }

  return value.toLocaleString(locale)
}

export const resolveOrderStatValue = (stats: Order["adminStats"], key: OrderStatKey): number => stats[key]

interface OrderStatCardProps {
  readonly activeFilter?: AdminOrderStatFilter | undefined
  readonly caption?: string | undefined
  readonly config: OrderStatCardConfig
  readonly currencyCode: string
  readonly displayValue?: string | undefined
  readonly onFilter?: ((filter?: AdminOrderStatFilter) => void) | undefined
  readonly valuesPending: boolean
}
