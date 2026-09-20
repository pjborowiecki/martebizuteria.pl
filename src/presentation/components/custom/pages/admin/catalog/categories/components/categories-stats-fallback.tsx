import { type JSX } from "react"

import { CATEGORY_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/catalog/categories/categories-stats.config"
import { CategoryStatCard } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/category-stat-card"
export const CategoriesStatsFallback = (): JSX.Element => (
  <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {CATEGORY_STAT_CARDS.map((config) => (
      <CategoryStatCard key={config.key} config={config} valuesPending />
    ))}
  </div>
)
