import { type JSX, useCallback, useMemo } from "react";

import { useTranslations } from "use-intl";

import { DataGridShell } from "~/src/components/custom/datagrid/components/data-grid-shell";
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { ProductSheet } from "~/src/components/custom/pages/admin/catalog/product-editor/product-sheet";
import { ProductsBulkActions } from "~/src/components/custom/pages/admin/catalog/products/components/products-bulk-actions";
import { ProductsCategoryFilter } from "~/src/components/custom/pages/admin/catalog/products/components/products-category-filter";
import { ProductsCollectionFilter } from "~/src/components/custom/pages/admin/catalog/products/components/products-collection-filter";
import { ProductsCreatedAtColumnFilter } from "~/src/components/custom/pages/admin/catalog/products/components/products-created-at-column-filter";
import { ProductsExportAction } from "~/src/components/custom/pages/admin/catalog/products/components/products-export-action";
import { ProductsPriceColumnFilter } from "~/src/components/custom/pages/admin/catalog/products/components/products-price-column-filter";
import { ProductsRefreshAction } from "~/src/components/custom/pages/admin/catalog/products/components/products-refresh-action";
import { ProductsStats } from "~/src/components/custom/pages/admin/catalog/products/components/products-stats";
import { ProductsStatusFilter } from "~/src/components/custom/pages/admin/catalog/products/components/products-status-filter";
import { ProductsStockColumnFilter } from "~/src/components/custom/pages/admin/catalog/products/components/products-stock-column-filter";
import { ProductsVariantKindFilter } from "~/src/components/custom/pages/admin/catalog/products/components/products-variant-kind-filter";
import { useProductsDataGrid } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid";
import {
  ProductsSheetProvider,
  useProductsSheet,
  useProductsSheetState
} from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-sheet";
import { productsDataGrid } from "~/src/components/custom/pages/admin/catalog/products/utils/products-data-grid";
import { CatalogToolbarAddButton } from "~/src/components/custom/pages/admin/catalog/toolbar/components/catalog-toolbar-add-button";

const { Body, Pagination, Provider, Toolbar } = productsDataGrid;

function ProductsTableToolbarActions(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const { openCreate } = useProductsSheet();

  return (
    <>
      <ProductsBulkActions />
      <CatalogToolbarAddButton onClick={openCreate}>{t("actions.addProduct")}</CatalogToolbarAddButton>
    </>
  );
}

export function ProductsTableContent(): JSX.Element {
  const sheet = useProductsSheet();
  const grid = useProductsDataGrid({ onRowClick: sheet.openEdit, onRowPointerEnter: sheet.prefetchEdit });

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      sheet.setOpen(open);
    },
    [sheet]
  );

  const toolbarActions = useMemo(() => <ProductsTableToolbarActions />, []);
  const toolbarFilters = useMemo(
    () => (
      <>
        <ProductsCategoryFilter />
        <ProductsCollectionFilter />
        <ProductsStatusFilter />
        <ProductsVariantKindFilter />
        <ProductsPriceColumnFilter />
        <ProductsStockColumnFilter />
        <ProductsCreatedAtColumnFilter />
      </>
    ),
    []
  );
  const sheetMode = sheet.mode === "closed" ? "create" : sheet.mode;

  return (
    <>
      <Provider value={grid}>
        <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
          <ProductsStats />
          <DataGridShell>
            <Toolbar actions={toolbarActions} filters={toolbarFilters}>
              <ProductsRefreshAction />
              <ProductsExportAction />
            </Toolbar>
            <Body />
            <Pagination />
          </DataGridShell>
        </div>
      </Provider>

      {sheet.open && <ProductSheet open onOpenChange={handleSheetOpenChange} mode={sheetMode} product={sheet.product} />}
    </>
  );
}

/** Products list: filterable, paginated datagrid (includes create/edit sheet). */
export function ProductsTable(): JSX.Element {
  const sheetState = useProductsSheetState();

  return (
    <ProductsSheetProvider value={sheetState}>
      <ProductsTableContent />
    </ProductsSheetProvider>
  );
}
