import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { type Product } from "~/src/modules/product/product.types"

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
import { type ProductsListFilterPatch } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid"
import {
  type ProductStatCardConfig,
  type ProductStatKey,
} from "~/src/presentation/components/custom/pages/admin/catalog/products/products-stats.config"

const PERCENT_SCALE = 100

interface ProductStatCardProps {
  readonly activeCategoryFilter?: string | undefined
  readonly activeCollectionFilter?: string | undefined
  readonly activeInventoryFilter?: string | undefined
  readonly activeStatusFilter?: string | undefined
  readonly activeVariantKindFilter?: string | undefined
  readonly caption?: string | undefined
  readonly config: ProductStatCardConfig
  readonly displayValue?: string
  readonly onFilter?: (patch?: ProductsListFilterPatch) => void
  readonly valuesPending: boolean
}

export const ProductStatCard = ({
  activeCategoryFilter,
  activeCollectionFilter,
  activeInventoryFilter,
  activeStatusFilter,
  activeVariantKindFilter,
  caption,
  config,
  displayValue,
  onFilter,
  valuesPending,
}: Readonly<ProductStatCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const { filterInventoryLevel, filterStatus, gradient, icon: Icon, key } = config
  const isFilterable = onFilter !== undefined && (filterStatus !== undefined || filterInventoryLevel !== undefined || key === "total")

  let isActive = false
  if (key === "total") {
    isActive =
      activeStatusFilter === undefined &&
      activeInventoryFilter === undefined &&
      activeCategoryFilter === undefined &&
      activeCollectionFilter === undefined &&
      activeVariantKindFilter === undefined
  } else if (filterInventoryLevel !== undefined) {
    isActive = activeInventoryFilter === filterInventoryLevel
  } else if (filterStatus !== undefined) {
    isActive = activeStatusFilter === filterStatus
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

  if (onFilter === undefined || (key !== "total" && filterStatus === undefined && filterInventoryLevel === undefined)) {
    return <Card className={cardClassName}>{content}</Card>
  }

  const handleFilterClick = (): void => {
    if (key === "total") {
      onFilter()

      return
    }

    if (filterInventoryLevel !== undefined) {
      onFilter(isActive ? { inventoryLevel: undefined } : { inventoryLevel: filterInventoryLevel })

      return
    }

    onFilter(isActive ? { status: undefined } : { status: filterStatus })
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

export const buildProductStatCaption = ({
  key,
  stats,
  t,
  value,
}: Readonly<{
  key: ProductStatKey
  stats: Product["stats"]
  t: ReturnType<typeof useTranslations<"pages.admin.catalog.products.catalogList">>
  value: number
}>): string | undefined => {
  if (key === "active" || key === "draft") {
    const percent = stats.total <= 0 ? 0 : Math.round((value / stats.total) * PERCENT_SCALE)

    return t("stats.shareCaption", { percent })
  }

  return undefined
}
