import { type JSX } from "react";

import { useTranslations } from "use-intl";

import { Skeleton } from "~/src/components/shadcn/skeleton";

import { DataGridShell } from "~/src/components/custom/datagrid/components/data-grid-shell";
import { CollectionsStatsFallback } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-stats-fallback";
import { useCollectionsDataGridShell } from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-collections-data-grid-shell";
import { collectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/utils/collections-data-grid";

const { Body, Pagination, Provider } = collectionsDataGrid;

function CollectionsToolbarFallback(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.collections");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-transparent px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-36 rounded-lg" aria-label={t("actions.addCollection")} />
    </div>
  );
}

/** Layout-matched fallback: real chrome, skeletons only for stat values and table rows. */
export function CollectionsPageFallback(): JSX.Element {
  const grid = useCollectionsDataGridShell();

  return (
    <Provider value={grid}>
      <div className="space-y-5">
        <CollectionsStatsFallback />
        <DataGridShell>
          <CollectionsToolbarFallback />
          <Body />
          <Pagination />
        </DataGridShell>
      </div>
    </Provider>
  );
}
