import { type JSX, useCallback } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl"

import { ADMIN_ORDER_STAT_FILTER, type AdminOrderStatFilter } from "~/src/modules/order/order.constants"
import { type AdminOrderStats } from "~/src/modules/order/order.types"

import { formatPrice } from "~/src/lib/currency"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { type OrderStatCardConfig, type OrderStatKey } from "~/src/presentation/components/custom/pages/admin/orders/orders-stats.config"
const renderStatCaptionSlot = ({
  caption,
  valuesPending,
}: Readonly<{
  caption?: string | undefined
  valuesPending: boolean
}>): JSX.Element | undefined => {
  if (valuesPending) {
    return <Skeleton className="h-3 w-28" />
  }
  if (caption === undefined) {
    return undefined
  }
  return <p className={STAT_CAPTION_CLASS}>{caption}</p>
}
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
  const handleFilterClick = useCallback(() => {
    if (onFilter === undefined || valuesPending) {
      return
    }
    if (isTotalCard) {
      onFilter()
      return
    }
    if (filter === undefined) {
      return
    }
    onFilter(isActive ? undefined : filter)
  }, [filter, isActive, isTotalCard, onFilter, valuesPending])
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
        <p className={STAT_LABEL_CLASS}>{t(`stats.${key}.label`)}</p>
        <div className={STAT_VALUE_SLOT_CLASS}>
          {valuesPending ? <Skeleton className="h-8 w-20" /> : <p className={STAT_VALUE_CLASS}>{displayValue}</p>}
        </div>
        <div className={STAT_CAPTION_SLOT_CLASS}>
          {renderStatCaptionSlot({
            caption,
            valuesPending,
          })}
        </div>
      </div>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary shadow-none">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
    </CardContent>
  )
  if (!isFilterable) {
    return <Card className={cardClassName}>{content}</Card>
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
export const resolveOrderStatValue = (stats: AdminOrderStats, key: OrderStatKey): number => stats[key]

const STAT_LABEL_CLASS = "text-[13px] leading-5 text-muted-foreground"
const STAT_VALUE_CLASS = "text-3xl leading-9 font-semibold tracking-tight tabular-nums"
const STAT_VALUE_SLOT_CLASS = "flex min-h-9 items-center"
const STAT_CAPTION_SLOT_CLASS = "flex min-h-4 items-center"
const STAT_CAPTION_CLASS = "text-xs text-muted-foreground/80"
interface OrderStatCardProps {
  readonly activeFilter?: AdminOrderStatFilter | undefined
  readonly caption?: string | undefined
  readonly config: OrderStatCardConfig
  readonly currencyCode: string
  readonly displayValue?: string | undefined
  readonly onFilter?: ((filter?: AdminOrderStatFilter) => void) | undefined
  readonly valuesPending: boolean
}
