import { type JSX, useCallback, useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CollectionSheet } from "~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-sheet"
import { CollectionsBulkActions } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-bulk-actions"
import { CollectionsExportAction } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-export-action"
import { CollectionsRefreshAction } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-refresh-action"
import { CollectionsStats } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-stats"
import { CollectionsStatusFilter } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-status-filter"
import { useCollectionsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-data-grid"
import {
  CollectionsSheetProvider,
  useCollectionsSheet,
  useCollectionsSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet"
import { collectionsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid"
import { CatalogToolbarAddButton } from "~/src/presentation/components/custom/pages/admin/catalog/toolbar/components/catalog-toolbar-add-button"

const CollectionsTableToolbarActions = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.collections")
  const { openCreate } = useCollectionsSheet()

  return (
    <>
      <CollectionsBulkActions />
      <CatalogToolbarAddButton onClick={openCreate}>{t("actions.addCollection")}</CatalogToolbarAddButton>
    </>
  )
}

export const CollectionsTableContent = (): JSX.Element => {
  const sheet = useCollectionsSheet()
  const grid = useCollectionsDataGrid({
    onRowClick: sheet.openEdit,
  })

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      sheet.setOpen(open)
    },
    [sheet],
  )

  const toolbarActions = useMemo(() => <CollectionsTableToolbarActions />, [])
  const sheetMode = sheet.mode === "closed" ? "create" : sheet.mode

  return (
    <>
      <Provider value={grid}>
        <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
          <CollectionsStats />
          <DataGridShell>
            <Toolbar actions={toolbarActions}>
              <CollectionsRefreshAction />
              <CollectionsExportAction />
              <CollectionsStatusFilter />
            </Toolbar>
            <Body />
            <Pagination />
          </DataGridShell>
        </div>
      </Provider>

      {sheet.open && <CollectionSheet open onOpenChange={handleSheetOpenChange} mode={sheetMode} collection={sheet.collection} />}
    </>
  )
}

export const CollectionsTable = (): JSX.Element => {
  const sheetState = useCollectionsSheetState()

  return (
    <CollectionsSheetProvider value={sheetState}>
      <CollectionsTableContent />
    </CollectionsSheetProvider>
  )
}

const { Body, Pagination, Provider, Toolbar } = collectionsDataGrid
