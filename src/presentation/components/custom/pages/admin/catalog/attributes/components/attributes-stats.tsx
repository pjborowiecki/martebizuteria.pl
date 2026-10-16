import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { getProductAttributeStatsQuery } from "~/src/modules/product-attribute/use-cases/get-product-attribute-stats"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { ADMIN_STAT_GRID_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { PRODUCT_ATTRIBUTE_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/attributes-stats.config"
import {
  AttributeStatCard,
  buildAttributeStatCaption,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attribute-stat-card"
import { useAttributesDataGridContext } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-data-grid"

export const AttributesStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const formatLocale = useFormatLocale()
  const { data: resolvedStats, isFetching, isStale } = useSuspenseQuery(getProductAttributeStatsQuery())
  const valuesPending = isFetching && isStale
  const { activeStatFilter, applyAttributeStatFilter } = useAttributesDataGridContext()

  return (
    <div className={ADMIN_STAT_GRID_CLASS}>
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
            displayValue={value.toLocaleString(formatLocale)}
            onFilter={applyAttributeStatFilter}
            valuesPending={valuesPending}
          />
        )
      })}
    </div>
  )
}
