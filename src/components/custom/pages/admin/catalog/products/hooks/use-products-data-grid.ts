import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ColumnFiltersState, PaginationState, SortingState, Table } from "@tanstack/react-table";
import { useTranslations } from "use-intl";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import type { DataGridContextValue } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useProductColumns } from "~/src/components/custom/pages/admin/catalog/products/components/products-columns";
import { useProductsListData } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-list-data";
import { useProductsRowReorder } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-row-reorder";
import { useProductsServerListSync } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-server-list-sync";
import { productsDataGrid } from "~/src/components/custom/pages/admin/catalog/products/utils/products-data-grid";

import { useAdminDebouncedTableSearch } from "~/src/hooks/use-admin-debounced-table-search";
import {
  hasAdminProductsListColumnFilters,
  parseAdminProductsListColumnFilters,
  type AdminProductsListColumnFilters
} from "~/src/modules/product/product.admin-list-filters";
import { parseAdminProductsListSort, type AdminProductsListSort } from "~/src/modules/product/product.admin-list-sort";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  PRODUCT_TABLE_COLUMN_ID,
  PRODUCT_TABLE_COLUMN_PINNING,
  PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type ProductInventoryLevel,
  type ProductStatus
} from "~/src/modules/product/product.constants";
import type { AdminProductsExportInput } from "~/src/modules/product/product.queries";
import type { Product } from "~/src/modules/product/product.types";

const TABLE_PAGE_INDEX_START = 0;

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

export function hasProductsServerListQuery(
  filters: ProductsListFilters,
  search: string,
  columnFilters: AdminProductsListColumnFilters
): boolean {
  return hasProductsListFilters(filters) || search !== "" || hasAdminProductsListColumnFilters(columnFilters);
}

function buildProductsExportListInput({
  columnFilters,
  filters,
  listSort,
  serverSearch
}: {
  readonly columnFilters: AdminProductsListColumnFilters;
  readonly filters: ProductsListFilters;
  readonly listSort: AdminProductsListSort | undefined;
  readonly serverSearch: string;
}): AdminProductsExportInput {
  return {
    categoryId: filters.categoryId,
    collectionId: filters.collectionId,
    createdAt: columnFilters.createdAt,
    inventoryLevel: filters.inventoryLevel,
    minPrice: columnFilters.minPrice,
    search: serverSearch === "" ? undefined : serverSearch,
    sort: listSort,
    status: filters.status,
    totalStock: columnFilters.totalStock
  };
}

function useUnfilteredProductsPageSize(table: Table<Product["adminListItem"]>, hasServerListQuery: boolean, rowCount: number): void {
  const tableRef = useRef(table);
  tableRef.current = table;

  useEffect(() => {
    const nextPageSize = hasServerListQuery ? ADMIN_PRODUCTS_PAGE_SIZE : Math.max(rowCount, ADMIN_PRODUCTS_PAGE_SIZE);
    const { pageIndex, pageSize } = tableRef.current.getState().pagination;

    if (pageSize !== nextPageSize) {
      tableRef.current.setPageSize(nextPageSize);
    }

    if (!hasServerListQuery && pageIndex !== TABLE_PAGE_INDEX_START) {
      tableRef.current.setPageIndex(TABLE_PAGE_INDEX_START);
    }
  }, [hasServerListQuery, rowCount]);
}

export interface ProductsDataGridValue extends DataGridContextValue<Product["adminListItem"]> {
  readonly activeCategoryFilter: string | undefined;
  readonly activeCollectionFilter: string | undefined;
  readonly activeInventoryFilter: ProductInventoryLevel | undefined;
  readonly activeStatusFilter: ProductStatus | undefined;
  readonly applyProductsFilter: (patch?: ProductsListFilterPatch) => void;
  readonly exportListInput: AdminProductsExportInput;
  readonly hasServerListQuery: boolean;
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
  const [serverSearch, setServerSearch] = useState("");
  const [serverSorting, setServerSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const serverListState = useMemo(
    () => ({
      listColumnFilters: parseAdminProductsListColumnFilters(columnFilters),
      listSort: parseAdminProductsListSort(serverSorting)
    }),
    [columnFilters, serverSorting]
  );
  const hasServerListQuery = hasProductsServerListQuery(filters, serverSearch, serverListState.listColumnFilters);
  const { ordering, pageCount, rowCount, showSkeletonRows, tableData } = useProductsListData({
    columnFilters: serverListState.listColumnFilters,
    filters,
    hasServerListQuery,
    pagination,
    search: serverSearch === "" ? undefined : serverSearch,
    sort: serverListState.listSort
  });

  const columns = useProductColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: tableData,
    defaultColumnVisibility: PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_PRODUCTS_PAGE_SIZE,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: PRODUCT_TABLE_COLUMN_PINNING,
    manualFiltering: hasServerListQuery,
    manualPagination: hasServerListQuery,
    manualSorting: hasServerListQuery,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: hasServerListQuery ? setPagination : undefined,
    onSortingChange: hasServerListQuery ? setServerSorting : undefined,
    pageCount: hasServerListQuery ? pageCount : undefined,
    pagination: hasServerListQuery ? pagination : undefined,
    persistenceKey: productsDataGrid.persistenceKey,
    rowCount: hasServerListQuery ? rowCount : undefined,
    sorting: hasServerListQuery ? serverSorting : undefined
  });

  const { debouncedSearch } = useAdminDebouncedTableSearch(table);

  useProductsServerListSync({
    columnFilters,
    debouncedSearch,
    hasServerListQuery,
    serverSorting,
    setPagination,
    setServerSearch,
    setServerSorting
  });

  const { sorting } = table.getState();
  const rowReorder = useProductsRowReorder({ columnFilters, hasServerListQuery, ordering, sorting });

  useUnfilteredProductsPageSize(table, hasServerListQuery, tableData.length);

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
      exportListInput: buildProductsExportListInput({
        columnFilters: serverListState.listColumnFilters,
        filters,
        listSort: serverListState.listSort,
        serverSearch
      }),
      hasPreferenceOverrides,
      hasServerListQuery,
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
      filters,
      hasPreferenceOverrides,
      hasServerListQuery,
      serverListState,
      onRowClick,
      onRowPointerEnter,
      resetPreferences,
      rowReorder,
      serverSearch,
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
