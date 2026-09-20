import { CheckCircle2, CircleOff, Layers, ListChecks, type LucideIcon } from "lucide-react"

import { PRODUCT_ATTRIBUTE_STAT_FILTER, type ProductAttributeStatFilter } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

export type ProductAttributeStatKey = keyof ProductAttribute["stats"]

export interface ProductAttributeStatCardConfig {
  readonly filterStat?: ProductAttributeStatFilter
  readonly gradient: string
  readonly icon: LucideIcon
  readonly key: ProductAttributeStatKey
}

export const PRODUCT_ATTRIBUTE_STAT_CARDS: readonly ProductAttributeStatCardConfig[] = [
  {
    gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
    icon: Layers,
    key: "total",
  },
  {
    filterStat: PRODUCT_ATTRIBUTE_STAT_FILTER.IN_USE,
    gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent",
    icon: CheckCircle2,
    key: "inUse",
  },
  {
    filterStat: PRODUCT_ATTRIBUTE_STAT_FILTER.UNUSED,
    gradient: "from-amber-500/20 via-amber-500/6 to-transparent",
    icon: CircleOff,
    key: "unused",
  },
  {
    filterStat: PRODUCT_ATTRIBUTE_STAT_FILTER.CHOICE,
    gradient: "from-purple-500/20 via-violet-500/6 to-transparent",
    icon: ListChecks,
    key: "withChoices",
  },
]
