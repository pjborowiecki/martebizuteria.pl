import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PaginationState, Table } from "@tanstack/react-table";
import { useTranslations } from "use-intl";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import { createCatalogTableGlobalFilterFn } from "~/src/components/custom/datagrid/lib/catalog-table-global-filter";
import type { DataGridContextValue, RowReorderApi } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { getProductAdminSearchParts } from "~/src/components/custom/pages/admin/catalog/lib/catalog-admin-table-search";
import { useProductColumns } from "~/src/components/custom/pages/admin/catalog/products/components/products-columns";
import { useProductsListData } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-list-data";
import { productsDataGrid } from "~/src/components/custom/pages/admin/catalog/products/utils/products-data-grid";

import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  PRODUCT_STATUS_LABEL_KEYS,
  PRODUCT_TABLE_COLUMN_ID,
  PRODUCT_TABLE_COLUMN_PINNING,
  PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type ProductInventoryLevel,
  type ProductStatus
} from "~/src/modules/product/product.constants";
import type { Product } from "~/src/modules/product/product.types";

const TABLE_PAGE_INDEX_START = 0;
const NONE = 0;

export interface ProductsListFilters {
  readonly categoryId?: string;
  readonly collectionId?: string;
  readonly inventoryLevel?: ProductInventoryLevel;
  readonly status?: ProductStatus;
}

export type ProductsListFilterPatch = {
  readonly [Key in keyof ProductsListFilters]?: ProductsListFilters[Key] | undefined;
};

type MutableProductsListFilters = {
  -readonly [Key in keyof ProductsListFilters]: ProductsListFilters[Key];
};

function applyProductsListFilterPatch(previous: ProductsListFilters, patch: ProductsListFilterPatch | undefined): ProductsListFilters {
  if (patch === undefined) {
    return {};
  }

  const next: MutableProductsListFilters = { ...previous };

  if ("categoryId" in patch) {
    if (patch.categoryId === undefined) {
      delete next.categoryId;
    } else {
      next.categoryId = patch.categoryId;
    }
  }

  if ("collectionId" in patch) {
    if (patch.collectionId === undefined) {
      delete next.collectionId;
    } else {
      next.collectionId = patch.collectionId;
    }
  }

  if ("inventoryLevel" in patch) {
    if (patch.inventoryLevel === undefined) {
      delete next.inventoryLevel;
    } else {
      next.inventoryLevel = patch.inventoryLevel;
    }
  }

  if ("status" in patch) {
    if (patch.status === undefined) {
      delete next.status;
    } else {
      next.status = patch.status;
    }
  }

  return next;
}

export function hasProductsListFilters(filters: ProductsListFilters): boolean {
  return (
    filters.categoryId !== undefined ||
    filters.collectionId !== undefined ||
    filters.inventoryLevel !== undefined ||
    filters.status !== undefined
  );
}

function useUnfilteredProductsPageSize(table: Table<Product["adminListItem"]>, hasListFilters: boolean, rowCount: number): void {
  const tableRef = useRef(table);
  tableRef.current = table;

  useEffect(() => {
    const nextPageSize = hasListFilters ? ADMIN_PRODUCTS_PAGE_SIZE : Math.max(rowCount, ADMIN_PRODUCTS_PAGE_SIZE);
    const { pageIndex, pageSize } = tableRef.current.getState().pagination;

    if (pageSize !== nextPageSize) {
      tableRef.current.setPageSize(nextPageSize);
    }

    if (!hasListFilters && pageIndex !== TABLE_PAGE_INDEX_START) {
      tableRef.current.setPageIndex(TABLE_PAGE_INDEX_START);
    }
  }, [hasListFilters, rowCount]);
}

export interface ProductsDataGridValue extends DataGridContextValue<Product["adminListItem"]> {
  readonly activeCategoryFilter: string | undefined;
  readonly activeCollectionFilter: string | undefined;
  readonly activeInventoryFilter: ProductInventoryLevel | undefined;
  readonly activeStatusFilter: ProductStatus | undefined;
  readonly applyProductsFilter: (patch?: ProductsListFilterPatch) => void;
}

interface UseProductsDataGridOptions {
  readonly onRowClick?: (product: Product["adminListItem"]) => void;
  readonly onRowPointerEnter?: (product: Product["adminListItem"]) => void;
}

export function useProductsDataGrid({ onRowClick, onRowPointerEnter }: UseProductsDataGridOptions): ProductsDataGridValue {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: TABLE_PAGE_INDEX_START,
    pageSize: ADMIN_PRODUCTS_PAGE_SIZE
  });
  const [filters, setFilters] = useState<ProductsListFilters>({});
  const hasListFilters = hasProductsListFilters(filters);
  const { ordering, pageCount, rowCount, showSkeletonRows, tableData } = useProductsListData({ filters, hasListFilters, pagination });

  const columns = useProductColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);
  const globalFilterFn = useMemo(
    () =>
      createCatalogTableGlobalFilterFn<Product["adminListItem"]>((row) => {
        const statusLabel = t(PRODUCT_STATUS_LABEL_KEYS[row.status]);
        return getProductAdminSearchParts(row, statusLabel);
      }),
    [t]
  );

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: tableData,
    defaultColumnVisibility: PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_PRODUCTS_PAGE_SIZE,
    getRowId: (row) => row.id,
    globalFilterFn,
    initialColumnOrder,
    initialColumnPinning: PRODUCT_TABLE_COLUMN_PINNING,
    manualPagination: hasListFilters,
    onPaginationChange: hasListFilters ? setPagination : undefined,
    pageCount: hasListFilters ? pageCount : undefined,
    pagination: hasListFilters ? pagination : undefined,
    persistenceKey: productsDataGrid.persistenceKey,
    rowCount: hasListFilters ? rowCount : undefined
  });

  const { columnFilters, sorting } = table.getState();
  const search = String(table.getState().globalFilter ?? "").trim();
  const naturalOrder = !hasListFilters && sorting.length === NONE && columnFilters.length === NONE && search === "";
  const rowReorder = useMemo<RowReorderApi>(
    () => ({
      draggingId: ordering.draggingId,
      enabled: naturalOrder,
      onRowDragEnter: ordering.handleDragEnter,
      onRowDragStart: ordering.handleDragStart,
      onRowDrop: ordering.handleDrop,
      onRowMove: ordering.handleMove
    }),
    [naturalOrder, ordering]
  );

  useUnfilteredProductsPageSize(table, hasListFilters, tableData.length);

  const statusColumn = table.getColumn(PRODUCT_TABLE_COLUMN_ID.status);
  const applyProductsFilter = useCallback(
    (patch?: ProductsListFilterPatch) => {
      setFilters((previous) => applyProductsListFilterPatch(previous, patch));
      if (patch === undefined || "status" in patch) {
        statusColumn?.setFilterValue(patch?.status);
      }
      setPagination((previous) => ({ ...previous, pageIndex: TABLE_PAGE_INDEX_START }));
    },
    [statusColumn]
  );

  return useMemo(
    () => ({
      activeCategoryFilter: filters.categoryId,
      activeCollectionFilter: filters.collectionId,
      activeInventoryFilter: filters.inventoryLevel,
      activeStatusFilter: filters.status,
      applyProductsFilter,
      columnReorder,
      hasPreferenceOverrides,
      isLoading: showSkeletonRows,
      onRowClick,
      onRowPointerEnter,
      persistenceKey: productsDataGrid.persistenceKey,
      resetPreferences,
      rowReorder,
      searchPlaceholder: t("searchPlaceholder"),
      table
    }),
    [
      applyProductsFilter,
      columnReorder,
      filters.categoryId,
      filters.collectionId,
      filters.inventoryLevel,
      filters.status,
      hasPreferenceOverrides,
      onRowClick,
      onRowPointerEnter,
      resetPreferences,
      rowReorder,
      showSkeletonRows,
      t,
      table
    ]
  );
}

function isProductsDataGridValue(value: DataGridContextValue<Product["adminListItem"]>): value is ProductsDataGridValue {
  return "applyProductsFilter" in value && typeof value.applyProductsFilter === "function";
}

/** Typed products grid context (stat cards, status filter). */
export function useProductsDataGridContext(): ProductsDataGridValue {
  const value = productsDataGrid.useDataGrid();
  if (!isProductsDataGridValue(value)) {
    throw new Error("useProductsDataGridContext must be used within the products table Provider.");
  }
  return value;
}
