import { useCallback, useEffect, useMemo, useState } from "react";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnFiltersState, PaginationState } from "@tanstack/react-table";
import { useTranslations } from "use-intl";

import { LIST_PAGE_STEP } from "~/src/lib/utils";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import type { DataGridContextValue } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useOrderColumns } from "~/src/components/custom/pages/admin/orders/components/orders-columns";
import { ordersDataGrid } from "~/src/components/custom/pages/admin/orders/utils/orders-data-grid";

import { useAdminDebouncedTableSearch } from "~/src/hooks/use-admin-debounced-table-search";
import { parseAdminOrdersListFilters } from "~/src/modules/order/order.admin-list-filters";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  ADMIN_ORDER_TABLE_COLUMN_PINNING,
  ADMIN_ORDER_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type AdminOrderStatFilter
} from "~/src/modules/order/order.constants";
import { type AdminOrdersExportInput, type AdminOrdersPageInput, orderQueryOptions } from "~/src/modules/order/order.queries";
import type { Order } from "~/src/modules/order/order.types";

const TABLE_PAGE_INDEX_START = 0;

const EMPTY_ORDERS_PAGE = {
  hasMore: false,
  items: [] as Order["adminListItem"][],
  limit: ADMIN_ORDERS_PAGE_SIZE,
  offset: 0,
  total: 0
} as const;

function buildAdminOrdersPageInput({
  listFilters,
  pageIndex,
  pageSize,
  search,
  statFilter
}: {
  readonly listFilters: ReturnType<typeof parseAdminOrdersListFilters>;
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly search: string;
  readonly statFilter: AdminOrderStatFilter | undefined;
}): AdminOrdersPageInput {
  return {
    createdAt: listFilters.createdAt,
    fulfillment: listFilters.fulfillment,
    page: pageIndex + LIST_PAGE_STEP,
    pageSize,
    payment: listFilters.payment,
    search: search === "" ? undefined : search,
    statFilter,
    status: listFilters.status,
    total: listFilters.total
  };
}

export interface OrdersDataGridValue extends DataGridContextValue<Order["adminListItem"]> {
  readonly activeStatFilter: AdminOrderStatFilter | undefined;
  readonly applyOrderStatFilter: (filter?: AdminOrderStatFilter) => void;
  readonly exportListInput: AdminOrdersExportInput;
}

interface UseOrdersDataGridOptions {
  readonly onRowClick?: (order: Order["adminListItem"]) => void;
}

export function useOrdersDataGrid({ onRowClick }: UseOrdersDataGridOptions): OrdersDataGridValue {
  const t = useTranslations("pages.admin.orders");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: TABLE_PAGE_INDEX_START,
    pageSize: ADMIN_ORDERS_PAGE_SIZE
  });
  const [statFilter, setStatFilter] = useState<AdminOrderStatFilter | undefined>();
  const [serverSearch, setServerSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const listFilters = useMemo(() => parseAdminOrdersListFilters(columnFilters), [columnFilters]);

  const pageInput = useMemo(
    () =>
      buildAdminOrdersPageInput({
        listFilters,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: serverSearch,
        statFilter
      }),
    [listFilters, pagination.pageIndex, pagination.pageSize, serverSearch, statFilter]
  );

  const pageQueryOptions = orderQueryOptions.adminOrdersPageQueryOptions(pageInput);

  const {
    data = EMPTY_ORDERS_PAGE,
    isFetching,
    isPending
  } = useQuery({
    ...pageQueryOptions,
    placeholderData: keepPreviousData
  });

  const showSkeletonRows = isFetching || isPending;
  const columns = useOrderColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);
  const pageCount = Math.ceil(data.total / pagination.pageSize);

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: [...data.items],
    defaultColumnVisibility: ADMIN_ORDER_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_ORDERS_PAGE_SIZE,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: ADMIN_ORDER_TABLE_COLUMN_PINNING,
    manualFiltering: true,
    manualPagination: true,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    pageCount,
    pagination,
    persistenceKey: ordersDataGrid.persistenceKey,
    rowCount: data.total
  });

  const { debouncedSearch } = useAdminDebouncedTableSearch(table);

  useEffect(() => {
    setServerSearch(debouncedSearch);
    setPagination((previous) => ({ ...previous, pageIndex: TABLE_PAGE_INDEX_START }));
  }, [debouncedSearch]);

  useEffect(() => {
    setPagination((previous) => ({ ...previous, pageIndex: TABLE_PAGE_INDEX_START }));
  }, [columnFilters]);

  const applyOrderStatFilter = useCallback((filter?: AdminOrderStatFilter) => {
    setStatFilter(filter);
    setPagination((previous) => ({ ...previous, pageIndex: TABLE_PAGE_INDEX_START }));
  }, []);

  const exportListInput = useMemo(
    (): AdminOrdersExportInput => ({
      createdAt: listFilters.createdAt,
      fulfillment: listFilters.fulfillment,
      payment: listFilters.payment,
      search: serverSearch === "" ? undefined : serverSearch,
      statFilter,
      status: listFilters.status,
      total: listFilters.total
    }),
    [listFilters, serverSearch, statFilter]
  );

  return useMemo(
    () => ({
      activeStatFilter: statFilter,
      applyOrderStatFilter,
      columnReorder,
      exportListInput,
      hasPreferenceOverrides,
      isLoading: showSkeletonRows,
      onRowClick,
      persistenceKey: ordersDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("searchPlaceholder"),
      table
    }),
    [
      applyOrderStatFilter,
      columnReorder,
      exportListInput,
      hasPreferenceOverrides,
      onRowClick,
      resetPreferences,
      showSkeletonRows,
      statFilter,
      t,
      table
    ]
  );
}

function isOrdersDataGridValue(value: DataGridContextValue<Order["adminListItem"]>): value is OrdersDataGridValue {
  return "applyOrderStatFilter" in value && typeof value.applyOrderStatFilter === "function";
}

export function useOrdersDataGridContext(): OrdersDataGridValue {
  const value = ordersDataGrid.useDataGrid();
  if (!isOrdersDataGridValue(value)) {
    throw new Error("useOrdersDataGridContext must be used within the orders table Provider.");
  }
  return value;
}
