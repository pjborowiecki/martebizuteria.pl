import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { getProductStatsQuery } from "~/src/modules/product/use-cases/get-product-stats"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { ADMIN_STAT_GRID_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import {
  ProductStatCard,
  buildProductStatCaption,
} from "~/src/presentation/components/custom/pages/admin/catalog/products/components/product-stat-card"
import { useProductsDataGridContext } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid"
import { PRODUCT_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/catalog/products/products-stats.config"

export const ProductsStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const formatLocale = useFormatLocale()
  const { data: resolvedStats, isFetching, isStale } = useSuspenseQuery(getProductStatsQuery())

  const valuesPending = isFetching && isStale
  const {
    activeCategoryFilter,
    activeCollectionFilter,
    activeInventoryFilter,
    activeStatusFilter,
    activeVariantKindFilter,
    applyProductsFilter,
  } = useProductsDataGridContext()

  return (
    <div className={ADMIN_STAT_GRID_CLASS}>
      {PRODUCT_STAT_CARDS.map((config) => {
        const value = resolvedStats[config.key]
        const caption = valuesPending
          ? undefined
          : buildProductStatCaption({
              key: config.key,
              stats: resolvedStats,
              t,
              value,
            })
        return (
          <ProductStatCard
            key={config.key}
            activeCategoryFilter={activeCategoryFilter}
            activeCollectionFilter={activeCollectionFilter}
            activeInventoryFilter={activeInventoryFilter}
            activeStatusFilter={activeStatusFilter}
            activeVariantKindFilter={activeVariantKindFilter}
            caption={caption}
            config={config}
            displayValue={value.toLocaleString(formatLocale)}
            onFilter={applyProductsFilter}
            valuesPending={valuesPending}
          />
        )
      })}
    </div>
  )
}
