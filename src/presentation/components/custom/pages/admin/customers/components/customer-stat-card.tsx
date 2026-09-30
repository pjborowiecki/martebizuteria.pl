import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import {
  ADMIN_CUSTOMER_STAT_FILTER,
  type AdminCustomerStatFilter,
  DEFAULT_ADMIN_CUSTOMER_CURRENCY,
} from "~/src/modules/user/user.constants"

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
import {
  type CustomerStatCardConfig,
  type CustomerStatKey,
} from "~/src/presentation/components/custom/pages/admin/customers/customers-stats.config"

export const CustomerStatCard = ({
  activeFilter,
  caption,
  config,
  displayValue,
  onFilter,
  valuesPending,
}: Readonly<CustomerStatCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.customers")
  const { filter, gradient, icon: Icon, key } = config
  const isTotalCard = key === "total"
  const isFilterable = onFilter !== undefined && (isTotalCard || filter !== undefined)
  let isActive = false
  if (isTotalCard) {
    isActive = activeFilter === undefined || activeFilter === ADMIN_CUSTOMER_STAT_FILTER.TOTAL
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
        {(valuesPending || caption !== undefined) && (
          <div className={ADMIN_STAT_CAPTION_SLOT_CLASS}>
            <AdminStatCaption caption={caption} valuesPending={valuesPending} />
          </div>
        )}
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

export const buildCustomerStatCaption = ({ key, t }: Readonly<BuildCustomerStatCaptionInput>): string | undefined => {
  if (key === "averageLtv" || key === "returningRate") {
    return t(`stats.${key}.caption`)
  }

  return undefined
}

export const formatCustomerStatDisplayValue = (key: CustomerStatKey, value: number, locale: string): string => {
  if (key === "averageLtv") {
    return formatPrice(value, DEFAULT_ADMIN_CUSTOMER_CURRENCY, locale)
  }

  if (key === "averageProductsPerOrder") {
    return value.toLocaleString(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })
  }

  if (key === "returningRate") {
    return `${value}%`
  }

  return value.toLocaleString(locale)
}

interface CustomerStatCardProps {
  readonly activeFilter?: AdminCustomerStatFilter | undefined
  readonly caption?: string | undefined
  readonly config: CustomerStatCardConfig
  readonly displayValue?: string | undefined
  readonly onFilter?: ((filter?: AdminCustomerStatFilter) => void) | undefined
  readonly valuesPending: boolean
}

interface BuildCustomerStatCaptionInput {
  readonly key: CustomerStatKey
  readonly t: ReturnType<typeof useTranslations<"pages.admin.customers">>
}
