import { type JSX } from "react"

import { PRODUCT_ATTRIBUTE_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/attributes-stats.config"
import { AttributeStatCard } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attribute-stat-card"
export const AttributesStatsFallback = (): JSX.Element => (
  <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {PRODUCT_ATTRIBUTE_STAT_CARDS.map((config) => (
      <AttributeStatCard key={config.key} config={config} valuesPending />
    ))}
  </div>
)
