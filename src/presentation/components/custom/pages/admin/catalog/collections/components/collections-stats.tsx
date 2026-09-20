import { type JSX, useCallback } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl"

import { type COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { collectionStatsQueryOptions } from "~/src/modules/product-collection/use-cases/get-collection-stats"

import { COLLECTION_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/catalog/collections/collections-stats.config"
import {
  CollectionStatCard,
  buildCollectionStatCaption,
  formatCollectionStatDisplayValue,
} from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collection-stat-card"
import { collectionsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid"

export const CollectionsStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.collections")
  const { data: resolvedStats, isFetching } = useSuspenseQuery(collectionStatsQueryOptions())
  const valuesPending = isFetching
  const { table } = collectionsDataGrid.useDataGrid()
  const statusColumn = table.getColumn("status")
  const rawFilter = statusColumn?.getFilterValue()
  const activeFilter = typeof rawFilter === "string" ? rawFilter : undefined
  const applyStatusFilter = useCallback(
    (status?: (typeof COLLECTION_STATUS)[keyof typeof COLLECTION_STATUS]) => {
      statusColumn?.setFilterValue(status)
      table.setPageIndex(0)
    },
    [statusColumn, table],
  )
  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLLECTION_STAT_CARDS.map((config) => {
        const value = resolvedStats[config.key]
        const caption = valuesPending
          ? undefined
          : buildCollectionStatCaption({
              key: config.key,
              stats: resolvedStats,
              t,
              value,
            })
        return (
          <CollectionStatCard
            key={config.key}
            activeFilter={activeFilter}
            caption={caption}
            config={config}
            displayValue={formatCollectionStatDisplayValue(config.key, value)}
            onFilter={applyStatusFilter}
            valuesPending={valuesPending}
          />
        )
      })}
    </div>
  )
}
