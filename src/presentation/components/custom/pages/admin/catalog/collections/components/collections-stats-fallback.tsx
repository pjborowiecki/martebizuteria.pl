import { type JSX } from "react"

import { COLLECTION_STAT_CARDS } from "~/src/presentation/components/custom/pages/admin/catalog/collections/collections-stats.config"
import { CollectionStatCard } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collection-stat-card"
export const CollectionsStatsFallback = (): JSX.Element => (
  <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {COLLECTION_STAT_CARDS.map((config) => (
      <CollectionStatCard key={config.key} config={config} valuesPending />
    ))}
  </div>
)
