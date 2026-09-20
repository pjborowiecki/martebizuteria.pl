import { type JSX, useCallback, useEffect, useMemo } from "react"

import { useSearch } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AttributeSheet } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-sheet"
import { AttributesBulkActions } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-bulk-actions"
import { AttributesExportAction } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-export-action"
import { AttributesRefreshAction } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-refresh-action"
import { AttributesStats } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-stats"
import { AttributesTypeFilter } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-type-filter"
import { useAttributesDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-data-grid"
import {
  AttributesSheetProvider,
  useAttributesSheet,
  useAttributesSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-sheet"
import { attributesDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid"
import { CatalogToolbarAddButton } from "~/src/presentation/components/custom/pages/admin/catalog/toolbar/components/catalog-toolbar-add-button"
const AttributesTableToolbarActions = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const { openCreate } = useAttributesSheet()
  return (
    <>
      <AttributesBulkActions />
      <CatalogToolbarAddButton onClick={openCreate}>{t("actions.addProperty")}</CatalogToolbarAddButton>
    </>
  )
}
export const AttributesTableContent = (): JSX.Element => {
  const sheet = useAttributesSheet()
  const { create } = useSearch({
    from: "/{-$locale}/admin/catalog/attributes/",
  })
  const grid = useAttributesDataGrid({
    onRowClick: sheet.openEdit,
  })
  useEffect(() => {
    if (create === "1") {
      sheet.openCreate()
    }
  }, [create, sheet])
  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      sheet.setOpen(open)
    },
    [sheet],
  )
  const toolbarActions = useMemo(() => <AttributesTableToolbarActions />, [])
  const sheetMode = sheet.mode === "closed" ? "create" : sheet.mode
  return (
    <>
      <Provider value={grid}>
        <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
          <AttributesStats />
          <DataGridShell>
            <Toolbar actions={toolbarActions}>
              <AttributesRefreshAction />
              <AttributesExportAction />
              <AttributesTypeFilter />
            </Toolbar>
            <Body />
            <Pagination />
          </DataGridShell>
        </div>
      </Provider>

      {sheet.open && <AttributeSheet open onOpenChange={handleSheetOpenChange} mode={sheetMode} attribute={sheet.attribute} />}
    </>
  )
}

export const AttributesTable = (): JSX.Element => {
  const sheetState = useAttributesSheetState()
  return (
    <AttributesSheetProvider value={sheetState}>
      <AttributesTableContent />
    </AttributesSheetProvider>
  )
}
const { Body, Pagination, Provider, Toolbar } = attributesDataGrid
