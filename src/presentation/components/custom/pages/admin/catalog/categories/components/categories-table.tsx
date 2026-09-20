import { type JSX, useCallback, useMemo } from "react"

import { useTranslations } from "use-intl"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CategorySheet } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-sheet"
import { CategoriesBulkActions } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-bulk-actions"
import { CategoriesExportAction } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-export-action"
import { CategoriesRefreshAction } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-refresh-action"
import { CategoriesStats } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-stats"
import { CategoriesStatusFilter } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-status-filter"
import { useCategoriesDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-categories-data-grid"
import {
  CategoriesSheetProvider,
  useCategoriesSheet,
  useCategoriesSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-categories-sheet"
import { categoriesDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid"
import { CatalogToolbarAddButton } from "~/src/presentation/components/custom/pages/admin/catalog/toolbar/components/catalog-toolbar-add-button"
const CategoriesTableToolbarActions = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")
  const { openCreate } = useCategoriesSheet()
  return (
    <>
      <CategoriesBulkActions />
      <CatalogToolbarAddButton onClick={openCreate}>{t("actions.addCategory")}</CatalogToolbarAddButton>
    </>
  )
}
export const CategoriesTableContent = (): JSX.Element => {
  const sheet = useCategoriesSheet()
  const grid = useCategoriesDataGrid({
    onRowClick: sheet.openEdit,
  })
  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      sheet.setOpen(open)
    },
    [sheet],
  )
  const toolbarActions = useMemo(() => <CategoriesTableToolbarActions />, [])
  const sheetMode = sheet.mode === "closed" ? "create" : sheet.mode
  return (
    <>
      <Provider value={grid}>
        <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
          <CategoriesStats />
          <DataGridShell>
            <Toolbar actions={toolbarActions}>
              <CategoriesRefreshAction />
              <CategoriesExportAction />
              <CategoriesStatusFilter />
            </Toolbar>
            <Body />
            <Pagination />
          </DataGridShell>
        </div>
      </Provider>

      {sheet.open && <CategorySheet open onOpenChange={handleSheetOpenChange} mode={sheetMode} category={sheet.category} />}
    </>
  )
}

export const CategoriesTable = (): JSX.Element => {
  const sheetState = useCategoriesSheetState()
  return (
    <CategoriesSheetProvider value={sheetState}>
      <CategoriesTableContent />
    </CategoriesSheetProvider>
  )
}
const { Body, Pagination, Provider, Toolbar } = categoriesDataGrid
