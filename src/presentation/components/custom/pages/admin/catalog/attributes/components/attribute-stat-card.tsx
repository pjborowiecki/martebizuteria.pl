import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { type ProductAttributeStatFilter } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

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
  type ProductAttributeStatCardConfig,
  type ProductAttributeStatKey,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/attributes-stats.config"

const PERCENT_SCALE = 100

interface AttributeStatCardProps {
  readonly activeFilter?: ProductAttributeStatFilter | undefined
  readonly caption?: string | undefined
  readonly config: ProductAttributeStatCardConfig
  readonly displayValue?: string
  readonly onFilter?: (filter?: ProductAttributeStatFilter) => void
  readonly valuesPending: boolean
}

export const AttributeStatCard = ({
  activeFilter,
  caption,
  config,
  displayValue,
  onFilter,
  valuesPending,
}: Readonly<AttributeStatCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const { filterStat, gradient, icon: Icon, key } = config
  const isFilterable = onFilter !== undefined && (filterStat !== undefined || key === "total")
  const isActive = key === "total" ? activeFilter === undefined : activeFilter === filterStat

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

  if (onFilter === undefined || (key !== "total" && filterStat === undefined)) {
    return <Card className={cardClassName}>{content}</Card>
  }

  const handleFilterClick = (): void => {
    if (filterStat === undefined) {
      onFilter()

      return
    }

    onFilter(isActive ? undefined : filterStat)
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

const statShare = (part: number, total: number): number => {
  if (total <= 0) {
    return 0
  }

  return Math.round((part / total) * PERCENT_SCALE)
}

interface BuildAttributeStatCaptionInput {
  readonly key: ProductAttributeStatKey
  readonly stats: ProductAttribute["stats"]
  readonly t: ReturnType<typeof useTranslations<"pages.admin.catalog.attributes">>
  readonly value: number
}

export const buildAttributeStatCaption = ({ key, stats, t, value }: Readonly<BuildAttributeStatCaptionInput>): string | undefined => {
  const sharePercent = key === "inUse" || key === "unused" || key === "withChoices" ? statShare(value, stats.total) : undefined

  if (sharePercent !== undefined) {
    return t("stats.shareCaption", { percent: sharePercent })
  }

  return undefined
}
