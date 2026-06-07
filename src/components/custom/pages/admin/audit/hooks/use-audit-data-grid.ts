import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { useTranslations } from "use-intl";

import type { DateTimeColumnFilterValue } from "~/src/lib/_utils/admin-datetime-filter";
import { LIST_PAGE_STEP } from "~/src/lib/utils";

import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import type { DataGridContextValue } from "~/src/components/custom/datagrid/lib/data-grid.types";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useAuditColumns } from "~/src/components/custom/pages/admin/audit/components/audit-columns";
import { auditDataGrid } from "~/src/components/custom/pages/admin/audit/utils/audit-data-grid";

import { useAdminDebouncedTableSearch } from "~/src/hooks/use-admin-debounced-table-search";
import {
  ADMIN_AUDIT_LOG_PAGE_SIZE,
  AUDIT_LOG_CATEGORY_FILTER,
  AUDIT_LOG_TABLE_COLUMN_PINNING,
  AUDIT_LOG_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type AuditLogCategoryFilter,
  type AuditLogSeverity
} from "~/src/modules/audit-log/audit-log.constants";
import { auditLogQueries, auditLogQueryOptions } from "~/src/modules/audit-log/audit-log.queries";
import type { AuditLog } from "~/src/modules/audit-log/audit-log.types";
import { resolveAuditLogCategoryFilter } from "~/src/modules/audit-log/audit-log.utils";

const TABLE_PAGE_INDEX_START = 0;

interface AuditListPageData {
  readonly hasMore: boolean;
  readonly items: readonly AuditLog["adminListItem"][];
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
}

const EMPTY_AUDIT_PAGE: AuditListPageData = {
  hasMore: false,
  items: [],
  limit: ADMIN_AUDIT_LOG_PAGE_SIZE,
  offset: 0,
  total: 0
};

export interface AuditListFilters {
  readonly category?: AuditLogCategoryFilter;
  readonly createdAt?: DateTimeColumnFilterValue;
  readonly severity?: AuditLogSeverity;
}

export type AuditListFilterPatch = {
  readonly [Key in keyof AuditListFilters]?: AuditListFilters[Key] | undefined;
};

export interface AuditDataGridValue extends DataGridContextValue<AuditLog["adminListItem"]> {
  readonly activeCategoryFilter: AuditLogCategoryFilter;
  readonly activeDateFilter: DateTimeColumnFilterValue | undefined;
  readonly activeSeverityFilter: AuditLogSeverity | undefined;
  readonly applyAuditFilter: (patch?: AuditListFilterPatch) => void;
}

export function useAuditDataGrid(): AuditDataGridValue {
  const t = useTranslations("pages.admin");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: TABLE_PAGE_INDEX_START,
    pageSize: ADMIN_AUDIT_LOG_PAGE_SIZE
  });
  const [filters, setFilters] = useState<AuditListFilters>({
    category: AUDIT_LOG_CATEGORY_FILTER.ALL
  });
  const [serverSearch, setServerSearch] = useState("");
  const listTotalRef = useRef<number>(EMPTY_AUDIT_PAGE.total);

  const pageQueryInput = useMemo(
    () => ({
      category: resolveAuditLogCategoryFilter(filters.category),
      createdAt: filters.createdAt,
      page: pagination.pageIndex + LIST_PAGE_STEP,
      pageSize: pagination.pageSize,
      search: serverSearch === "" ? undefined : serverSearch,
      severity: filters.severity
    }),
    [filters.category, filters.createdAt, filters.severity, pagination.pageIndex, pagination.pageSize, serverSearch]
  );

  useEffect(() => {
    listTotalRef.current = EMPTY_AUDIT_PAGE.total;
  }, [filters.category, filters.createdAt, filters.severity, serverSearch]);

  const pageQueryOptions = auditLogQueryOptions.adminAuditLogsPageQueryOptions(pageQueryInput);

  const {
    data = EMPTY_AUDIT_PAGE,
    isFetching,
    isPending
  } = useQuery({
    ...pageQueryOptions,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const page = await auditLogQueries.fetchAdminAuditLogsPageFn({ data: pageQueryInput });

      if (page.total !== undefined) {
        listTotalRef.current = page.total;
      }

      return {
        ...page,
        total: page.total ?? listTotalRef.current
      };
    }
  });

  const showSkeletonRows = isFetching || isPending;
  const columns = useAuditColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);
  const resolvedListTotal = data.total ?? listTotalRef.current;
  const pageCount = Math.ceil(resolvedListTotal / pagination.pageSize);

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: [...data.items],
    defaultColumnVisibility: AUDIT_LOG_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_AUDIT_LOG_PAGE_SIZE,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: AUDIT_LOG_TABLE_COLUMN_PINNING,
    manualFiltering: true,
    manualPagination: true,
    onPaginationChange: setPagination,
    pageCount,
    pagination,
    persistenceKey: auditDataGrid.persistenceKey,
    rowCount: resolvedListTotal
  });

  const { debouncedSearch } = useAdminDebouncedTableSearch(table);

  useEffect(() => {
    setServerSearch(debouncedSearch);
    setPagination((previous) => ({ ...previous, pageIndex: TABLE_PAGE_INDEX_START }));
  }, [debouncedSearch]);

  const applyAuditFilter = useCallback((patch?: AuditListFilterPatch) => {
    if (patch === undefined) {
      return;
    }

    setFilters((previous) => ({ ...previous, ...patch }));
    setPagination((previous) => ({ ...previous, pageIndex: TABLE_PAGE_INDEX_START }));
  }, []);

  return useMemo(
    () => ({
      activeCategoryFilter: filters.category ?? AUDIT_LOG_CATEGORY_FILTER.ALL,
      activeDateFilter: filters.createdAt,
      activeSeverityFilter: filters.severity,
      applyAuditFilter,
      columnReorder,
      hasPreferenceOverrides,
      isLoading: showSkeletonRows,
      persistenceKey: auditDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("audit.searchPlaceholder"),
      table
    }),
    [
      applyAuditFilter,
      columnReorder,
      filters.category,
      filters.createdAt,
      filters.severity,
      hasPreferenceOverrides,
      resetPreferences,
      showSkeletonRows,
      t,
      table
    ]
  );
}

function isAuditDataGridValue(value: DataGridContextValue<AuditLog["adminListItem"]>): value is AuditDataGridValue {
  return "applyAuditFilter" in value && typeof value.applyAuditFilter === "function";
}

export function useAuditDataGridContext(): AuditDataGridValue {
  const value = auditDataGrid.useDataGrid();
  if (!isAuditDataGridValue(value)) {
    throw new Error("useAuditDataGridContext must be used within the audit table Provider.");
  }
  return value;
}
