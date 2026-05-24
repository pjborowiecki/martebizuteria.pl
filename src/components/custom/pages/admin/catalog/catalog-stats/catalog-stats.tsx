import type { JSX } from "react";

import { CatalogStatCard } from "~/src/components/custom/pages/admin/catalog/catalog-stats/catalog-stat-card";

import type { ProductStatRecord } from "~/src/data/catalog-data";

interface CatalogStatsProps {
  readonly stats: readonly ProductStatRecord[];
}

export function CatalogStats({ stats }: CatalogStatsProps): JSX.Element {
  return (
    <div className="grid gap-5 sm:grid-cols-4">
      {stats.map((stat) => (
        <CatalogStatCard key={stat.key} stat={stat} />
      ))}
    </div>
  );
}
