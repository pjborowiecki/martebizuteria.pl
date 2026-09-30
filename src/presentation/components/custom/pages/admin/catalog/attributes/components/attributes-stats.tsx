import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { getProductAttributeStatsQuery } from "~/src/modules/product-attribute/use-cases/get-product-attribute-stats"

import { PRODUCT_ATTRIBUTE_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/attributes-stats.config"
import {
  AttributeStatCard,
  buildAttributeStatCaption,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attribute-stat-card"
import { useAttributesDataGridContext } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-data-grid"

export const AttributesStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const { data: resolvedStats, isFetching, isStale } = useSuspenseQuery(getProductAttributeStatsQuery())
  const valuesPending = isFetching && isStale
  const { activeStatFilter, applyAttributeStatFilter } = useAttributesDataGridContext()

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PRODUCT_ATTRIBUTE_STAT_CARDS.map((config) => {
        const value = resolvedStats[config.key]
        const caption = valuesPending
          ? undefined
          : buildAttributeStatCaption({
              key: config.key,
              stats: resolvedStats,
              t,
              value,
            })
        return (
          <AttributeStatCard
            key={config.key}
            activeFilter={activeStatFilter}
            caption={caption}
            config={config}
            displayValue={value.toLocaleString()}
            onFilter={applyAttributeStatFilter}
            valuesPending={valuesPending}
          />
        )
      })}
    </div>
  )
}
