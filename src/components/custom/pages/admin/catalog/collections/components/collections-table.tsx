import { type JSX, useCallback, useMemo } from "react";

import { useTranslations } from "use-intl";

import { DataGridShell } from "~/src/components/custom/datagrid/components/data-grid-shell";
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { CollectionSheet } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-sheet";
import { CollectionsBulkActions } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-bulk-actions";
import { CollectionsExportAction } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-export-action";
import { CollectionsRefreshAction } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-refresh-action";
import { CollectionsStats } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-stats";
import { CollectionsStatusFilter } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-status-filter";
import { useCollectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-collections-data-grid";
import {
  CollectionsSheetProvider,
  useCollectionsSheet,
  useCollectionsSheetState
} from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet";
import { collectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/utils/collections-data-grid";
import { CatalogToolbarAddButton } from "~/src/components/custom/pages/admin/catalog/toolbar/components/catalog-toolbar-add-button";

const { Body, Pagination, Provider, Toolbar } = collectionsDataGrid;

function CollectionsTableToolbarActions(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.collections");
  const { openCreate } = useCollectionsSheet();

  return (
    <>
      <CollectionsBulkActions />
      <CatalogToolbarAddButton onClick={openCreate}>{t("actions.addCollection")}</CatalogToolbarAddButton>
    </>
  );
}

export function CollectionsTableContent(): JSX.Element {
  const sheet = useCollectionsSheet();
  const grid = useCollectionsDataGrid({ onRowClick: sheet.openEdit });

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      sheet.setOpen(open);
    },
    [sheet]
  );

  const toolbarActions = useMemo(() => <CollectionsTableToolbarActions />, []);

  const sheetMode = sheet.mode === "closed" ? "create" : sheet.mode;

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
  );
}

/** Collections list: a reorderable, filterable, paginated datagrid (includes sheet). */
export function CollectionsTable(): JSX.Element {
  const sheetState = useCollectionsSheetState();

  return (
    <CollectionsSheetProvider value={sheetState}>
      <CollectionsTableContent />
    </CollectionsSheetProvider>
  );
}
