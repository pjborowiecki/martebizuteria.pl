import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { type CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

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
  type CategoryStatCardConfig,
  type CategoryStatKey,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/categories-stats.config"

export const CategoryStatCard = ({
  activeFilter,
  caption,
  config,
  displayValue,
  onFilter,
  valuesPending,
}: Readonly<CategoryStatCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")
  const { filterStatus, gradient, icon: Icon, key } = config
  const isFilterable = onFilter !== undefined && (filterStatus !== undefined || key === "total")
  const isActive = key === "total" ? activeFilter === undefined : activeFilter === filterStatus
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

  if (onFilter === undefined || (key !== "total" && filterStatus === undefined)) {
    return <Card className={cardClassName}>{content}</Card>
  }

  const handleFilterClick = (): void => {
    if (filterStatus === undefined) {
      onFilter()

      return
    }
    onFilter(isActive ? undefined : filterStatus)
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

export const formatCategoryStatValue = (key: CategoryStatKey, value: number): string => {
  if (key === "avgProducts") {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: AVG_PRODUCTS_DECIMALS,
    })
  }

  return value.toLocaleString()
}

export const buildCategoryStatCaption = ({ key, stats, t, value }: Readonly<BuildCategoryStatCaptionInput>): string | undefined => {
  const sharePercent = key === "active" || key === "draft" ? statShare(value, stats.total) : undefined
  if (sharePercent !== undefined) {
    return t("stats.shareCaption", {
      percent: sharePercent,
    })
  }

  if (key === "avgProducts") {
    return t("stats.avgProducts.caption", {
      count: Math.round(stats.avgProducts * stats.total).toLocaleString(),
    })
  }

  return undefined
}

const statShare = (part: number, total: number): number => {
  if (total <= 0) {
    return 0
  }

  return Math.round((part / total) * PERCENT_SCALE)
}

interface CategoryStatCardProps {
  readonly activeFilter?: string | undefined
  readonly caption?: string | undefined
  readonly config: CategoryStatCardConfig
  readonly displayValue?: string
  readonly onFilter?: (status?: (typeof CATEGORY_STATUS)[keyof typeof CATEGORY_STATUS]) => void
  readonly valuesPending: boolean
}

const PERCENT_SCALE = 100

const AVG_PRODUCTS_DECIMALS = 1

interface BuildCategoryStatCaptionInput {
  readonly key: CategoryStatKey
  readonly stats: ProductCategory["stats"]
  readonly t: ReturnType<typeof useTranslations<"pages.admin.catalog.categories">>
  readonly value: number
}
