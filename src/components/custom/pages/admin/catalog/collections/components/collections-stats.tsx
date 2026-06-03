import { type JSX, useCallback } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { COLLECTION_STAT_CARDS } from "~/src/components/custom/pages/admin/catalog/collections/collections-stats.config";
import {
  buildCollectionStatCaption,
  CollectionStatCard,
  formatCollectionStatDisplayValue
} from "~/src/components/custom/pages/admin/catalog/collections/components/collection-stat-card";
import { collectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/utils/collections-data-grid";

import type { COLLECTION_STATUS } from "~/src/modules/collection/collection.constants";
import { collectionQueryOptions } from "~/src/modules/collection/collection.queries";

const TABLE_PAGE_INDEX_START = 0;

/** Lives inside `collectionsDataGrid.Provider` so cards can sync the status filter. */
export function CollectionsStats(): JSX.Element {
  const t = useTranslations("admin");
  const { data: resolvedStats, isFetching } = useSuspenseQuery(collectionQueryOptions.collectionStatsQueryOptions());
  const valuesPending = isFetching;

  const { table } = collectionsDataGrid.useDataGrid();
  const statusColumn = table.getColumn("status");
  const rawFilter = statusColumn?.getFilterValue();
  const activeFilter = typeof rawFilter === "string" ? rawFilter : undefined;

  const applyStatusFilter = useCallback(
    (status?: (typeof COLLECTION_STATUS)[keyof typeof COLLECTION_STATUS]) => {
      statusColumn?.setFilterValue(status);
      table.setPageIndex(TABLE_PAGE_INDEX_START);
    },
    [statusColumn, table]
  );

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLLECTION_STAT_CARDS.map((config) => {
        const value = resolvedStats[config.key];
        const caption = valuesPending ? undefined : buildCollectionStatCaption({ key: config.key, stats: resolvedStats, t, value });

        return (
          <CollectionStatCard
            key={config.key}
            activeFilter={activeFilter}
            caption={caption}
            config={config}
            displayValue={value === undefined ? undefined : formatCollectionStatDisplayValue(config.key, value)}
            onFilter={applyStatusFilter}
            valuesPending={valuesPending}
          />
        );
      })}
    </div>
  );
}
