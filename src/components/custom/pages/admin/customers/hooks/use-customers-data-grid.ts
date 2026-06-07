import { useCallback, useEffect, useMemo, useState } from "react";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnFiltersState, PaginationState } from "@tanstack/react-table";
import { useTranslations } from "use-intl";

import { LIST_PAGE_STEP } from "~/src/lib/utils";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import type { DataGridContextValue } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useCustomerColumns } from "~/src/components/custom/pages/admin/customers/components/customers-columns";
import { customersDataGrid } from "~/src/components/custom/pages/admin/customers/utils/customers-data-grid";

import { useAdminDebouncedTableSearch } from "~/src/hooks/use-admin-debounced-table-search";
import { parseAdminCustomersListFilters } from "~/src/modules/user/user.admin-list-filters";
import {
  ADMIN_CUSTOMER_PAGE_SIZE,
  ADMIN_CUSTOMER_TABLE_COLUMN_PINNING,
  ADMIN_CUSTOMER_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type AdminCustomerStatFilter
} from "~/src/modules/user/user.constants";
import { type AdminCustomersExportInput, type AdminCustomersPageInput, userQueryOptions } from "~/src/modules/user/user.queries";
import type { User } from "~/src/modules/user/user.types";

const TABLE_PAGE_INDEX_START = 0;

const EMPTY_CUSTOMERS_PAGE = {
  hasMore: false,
  items: [] as User["adminCustomerListItem"][],
  limit: ADMIN_CUSTOMER_PAGE_SIZE,
  offset: 0,
  total: 0
} as const;

function buildAdminCustomersPageInput({
  listFilters,
  pageIndex,
  pageSize,
  search,
  statFilter
}: {
  readonly listFilters: ReturnType<typeof parseAdminCustomersListFilters>;
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly search: string;
  readonly statFilter: AdminCustomerStatFilter | undefined;
}): AdminCustomersPageInput {
  return {
    averageOrderValue: listFilters.averageOrderValue,
    banned: listFilters.banned,
    createdAt: listFilters.createdAt,
    emailVerified: listFilters.emailVerified,
    lastOrderAt: listFilters.lastOrderAt,
    page: pageIndex + LIST_PAGE_STEP,
    pageSize,
    role: listFilters.role,
    search: search === "" ? undefined : search,
    statFilter,
    totalSpent: listFilters.totalSpent
  };
}

export interface CustomersDataGridValue extends DataGridContextValue<User["adminCustomerListItem"]> {
  readonly activeStatFilter: AdminCustomerStatFilter | undefined;
  readonly applyCustomerStatFilter: (filter?: AdminCustomerStatFilter) => void;
  readonly exportListInput: AdminCustomersExportInput;
}

interface UseCustomersDataGridOptions {
  readonly onRowClick?: (customer: User["adminCustomerListItem"]) => void;
}

export function useCustomersDataGrid({ onRowClick }: UseCustomersDataGridOptions): CustomersDataGridValue {
  const t = useTranslations("pages.admin.customers");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: TABLE_PAGE_INDEX_START,
    pageSize: ADMIN_CUSTOMER_PAGE_SIZE
  });
  const [statFilter, setStatFilter] = useState<AdminCustomerStatFilter | undefined>();
  const [serverSearch, setServerSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const listFilters = useMemo(() => parseAdminCustomersListFilters(columnFilters), [columnFilters]);

  const pageInput = useMemo(
    () =>
      buildAdminCustomersPageInput({
        listFilters,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: serverSearch,
        statFilter
      }),
    [listFilters, pagination.pageIndex, pagination.pageSize, serverSearch, statFilter]
  );

  const pageQueryOptions = userQueryOptions.adminCustomersPageQueryOptions(pageInput);

  const {
    data = EMPTY_CUSTOMERS_PAGE,
    isFetching,
    isPending
  } = useQuery({
    ...pageQueryOptions,
    placeholderData: keepPreviousData
  });

  const showSkeletonRows = isFetching || isPending;
  const columns = useCustomerColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);
  const pageCount = Math.ceil(data.total / pagination.pageSize);

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: [...data.items],
    defaultColumnVisibility: ADMIN_CUSTOMER_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_CUSTOMER_PAGE_SIZE,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: ADMIN_CUSTOMER_TABLE_COLUMN_PINNING,
    manualFiltering: true,
    manualPagination: true,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    pageCount,
    pagination,
    persistenceKey: customersDataGrid.persistenceKey,
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

  const applyCustomerStatFilter = useCallback((filter?: AdminCustomerStatFilter) => {
    setStatFilter(filter);
    setPagination((previous) => ({ ...previous, pageIndex: TABLE_PAGE_INDEX_START }));
  }, []);

  const exportListInput = useMemo(
    (): AdminCustomersExportInput => ({
      averageOrderValue: listFilters.averageOrderValue,
      banned: listFilters.banned,
      createdAt: listFilters.createdAt,
      emailVerified: listFilters.emailVerified,
      lastOrderAt: listFilters.lastOrderAt,
      role: listFilters.role,
      search: serverSearch === "" ? undefined : serverSearch,
      statFilter,
      totalSpent: listFilters.totalSpent
    }),
    [listFilters, serverSearch, statFilter]
  );

  return useMemo(
    () => ({
      activeStatFilter: statFilter,
      applyCustomerStatFilter,
      columnReorder,
      exportListInput,
      hasPreferenceOverrides,
      isLoading: showSkeletonRows,
      onRowClick,
      persistenceKey: customersDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("searchPlaceholder"),
      table
    }),
    [
      applyCustomerStatFilter,
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

function isCustomersDataGridValue(value: DataGridContextValue<User["adminCustomerListItem"]>): value is CustomersDataGridValue {
  return "applyCustomerStatFilter" in value && typeof value.applyCustomerStatFilter === "function";
}

/** Typed customers grid context (stat cards, filters). */
export function useCustomersDataGridContext(): CustomersDataGridValue {
  const value = customersDataGrid.useDataGrid();
  if (!isCustomersDataGridValue(value)) {
    throw new Error("useCustomersDataGridContext must be used within the customers table Provider.");
  }
  return value;
}
