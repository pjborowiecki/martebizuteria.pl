import { type JSX } from "react";

import { useTranslations } from "use-intl";

import { Skeleton } from "~/src/components/shadcn/skeleton";

import { DataGridShell } from "~/src/components/custom/datagrid/components/data-grid-shell";
import { CategoriesStatsFallback } from "~/src/components/custom/pages/admin/catalog/categories/components/categories-stats-fallback";
import { useCategoriesDataGridShell } from "~/src/components/custom/pages/admin/catalog/categories/hooks/use-categories-data-grid-shell";
import { categoriesDataGrid } from "~/src/components/custom/pages/admin/catalog/categories/utils/categories-data-grid";

const { Body, Pagination, Provider } = categoriesDataGrid;

function CategoriesToolbarFallback(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-transparent px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-36 rounded-lg" aria-label={t("actions.addCategory")} />
    </div>
  );
}

/** Layout-matched fallback: real chrome, skeletons only for stat values and table rows. */
export function CategoriesPageFallback(): JSX.Element {
  const grid = useCategoriesDataGridShell();

  return (
    <Provider value={grid}>
      <div className="space-y-5">
        <CategoriesStatsFallback />
        <DataGridShell>
          <CategoriesToolbarFallback />
          <Body />
          <Pagination />
        </DataGridShell>
      </div>
    </Provider>
  );
}
