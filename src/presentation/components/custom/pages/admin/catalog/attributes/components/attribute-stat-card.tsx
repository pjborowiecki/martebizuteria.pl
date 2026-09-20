import { type JSX, useCallback } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl"

import { type ProductAttributeStatFilter } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import {
  ADMIN_CARD_CLASS,
  ADMIN_STAT_CARD_FILTER_ACTIVE_CLASS,
  ADMIN_STAT_CARD_FILTER_HOVER_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import {
  type ProductAttributeStatCardConfig,
  type ProductAttributeStatKey,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/attributes-stats.config"

const STAT_LABEL_CLASS = "text-[13px] leading-5 text-muted-foreground"
const STAT_VALUE_CLASS = "text-3xl leading-9 font-semibold tracking-tight tabular-nums"
const STAT_VALUE_SLOT_CLASS = "flex min-h-9 items-center"
const STAT_CAPTION_SLOT_CLASS = "flex min-h-4 items-center"
const STAT_CAPTION_CLASS = "text-xs text-muted-foreground/80"

const PERCENT_SCALE = 100

const renderStatCaptionSlot = ({
  caption,
  valuesPending,
}: Readonly<{ caption?: string | undefined; valuesPending: boolean }>): JSX.Element | undefined => {
  if (valuesPending) {
    return <Skeleton className="h-3 w-28" />
  }

  if (caption === undefined) {
    return undefined
  }

  return <p className={STAT_CAPTION_CLASS}>{caption}</p>
}

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

  const handleFilterClick = useCallback(() => {
    if (onFilter === undefined || valuesPending) {
      return
    }

    if (filterStat === undefined) {
      onFilter()
      return
    }

    onFilter(isActive ? undefined : filterStat)
  }, [filterStat, isActive, onFilter, valuesPending])

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
        <div className={STAT_CAPTION_SLOT_CLASS}>{renderStatCaptionSlot({ caption, valuesPending })}</div>
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

export const formatAttributeStatDisplayValue = (value: number): string => value.toLocaleString()
