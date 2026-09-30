import { CheckCircle2, FolderTree, type LucideIcon, Package, PencilLine } from "lucide-react"

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

export type CategoryStatKey = keyof ProductCategory["stats"]

export interface CategoryStatCardConfig {
  readonly filterStatus?: (typeof CATEGORY_STATUS)[keyof typeof CATEGORY_STATUS]
  readonly gradient: string
  readonly icon: LucideIcon
  readonly key: CategoryStatKey
}

export const CATEGORY_STAT_CARDS: readonly CategoryStatCardConfig[] = [
  {
    gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
    icon: FolderTree,
    key: "total",
  },
  {
    filterStatus: CATEGORY_STATUS.ACTIVE,
    gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent",
    icon: CheckCircle2,
    key: "active",
  },
  {
    filterStatus: CATEGORY_STATUS.DRAFT,
    gradient: "from-amber-500/20 via-amber-500/6 to-transparent",
    icon: PencilLine,
    key: "draft",
  },
  {
    gradient: "from-purple-500/20 via-violet-500/6 to-transparent",
    icon: Package,
    key: "avgProducts",
  },
]
