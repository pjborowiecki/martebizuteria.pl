import { type JSX, useCallback } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { type CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { getCategoryStatsQuery } from "~/src/modules/product-category/use-cases/get-category-stats"

import { CATEGORY_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/catalog/categories/categories-stats.config"
import {
  CategoryStatCard,
  buildCategoryStatCaption,
  formatCategoryStatValue,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/category-stat-card"
import { categoriesDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid"

export const CategoriesStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")
  const { data: resolvedStats, isFetching } = useSuspenseQuery(getCategoryStatsQuery())
  const valuesPending = isFetching
  const { table } = categoriesDataGrid.useDataGrid()
  const statusColumn = table.getColumn("status")
  const rawFilter = statusColumn?.getFilterValue()
  const activeFilter = typeof rawFilter === "string" ? rawFilter : undefined
  const applyStatusFilter = useCallback(
    (status?: (typeof CATEGORY_STATUS)[keyof typeof CATEGORY_STATUS]) => {
      statusColumn?.setFilterValue(status)
      table.setPageIndex(0)
    },
    [statusColumn, table],
  )

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CATEGORY_STAT_CARDS.map((config) => {
        const value = resolvedStats[config.key]
        const caption = valuesPending
          ? undefined
          : buildCategoryStatCaption({
              key: config.key,
              stats: resolvedStats,
              t,
              value,
            })
        return (
          <CategoryStatCard
            key={config.key}
            activeFilter={activeFilter}
            caption={caption}
            config={config}
            displayValue={formatCategoryStatValue(config.key, value)}
            onFilter={applyStatusFilter}
            valuesPending={valuesPending}
          />
        )
      })}
    </div>
  )
}
