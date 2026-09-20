import { type JSX } from "react"

import { type ProductStatRecord } from "~/src/data/catalog-data"

import { CatalogStatCard } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-stats/catalog-stat-card"
export const CatalogStats = ({ stats }: CatalogStatsProps): JSX.Element => (
  <div className="grid gap-5 sm:grid-cols-4">
    {stats.map((stat) => (
      <CatalogStatCard key={stat.key} stat={stat} />
    ))}
  </div>
)

interface CatalogStatsProps {
  readonly stats: readonly ProductStatRecord[]
}
