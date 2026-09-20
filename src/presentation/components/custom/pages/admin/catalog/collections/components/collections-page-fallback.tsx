import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CollectionsStatsFallback } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-stats-fallback"
import { useCollectionsDataGridShell } from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-data-grid-shell"
import { collectionsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid"
const CollectionsToolbarFallback = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.collections")
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-transparent px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-36 rounded-lg" aria-label={t("actions.addCollection")} />
    </div>
  )
}

export const CollectionsPageFallback = (): JSX.Element => {
  const grid = useCollectionsDataGridShell()
  return (
    <Provider value={grid}>
      <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
        <CollectionsStatsFallback />
        <DataGridShell>
          <CollectionsToolbarFallback />
          <Body />
          <Pagination />
        </DataGridShell>
      </div>
    </Provider>
  )
}
const { Body, Pagination, Provider } = collectionsDataGrid
