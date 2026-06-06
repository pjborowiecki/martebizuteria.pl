import { useCallback, useEffect, useMemo, useState } from "react";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { useTranslations } from "use-intl";

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
  AUDIT_LOG_DATE_RANGE,
  AUDIT_LOG_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type AuditLogCategoryFilter,
  type AuditLogDateRange,
  type AuditLogSeverity
} from "~/src/modules/audit-log/audit-log.constants";
import { auditLogQueryOptions } from "~/src/modules/audit-log/audit-log.queries";
import type { AuditLog } from "~/src/modules/audit-log/audit-log.types";
import { resolveAuditLogCategoryFilter } from "~/src/modules/audit-log/audit-log.utils";

const TABLE_PAGE_INDEX_START = 0;

const EMPTY_AUDIT_PAGE = {
  hasMore: false,
  items: [] as AuditLog["adminListItem"][],
  limit: ADMIN_AUDIT_LOG_PAGE_SIZE,
  offset: 0,
  total: 0
} as const;

export interface AuditListFilters {
  readonly category?: AuditLogCategoryFilter;
  readonly dateRange?: AuditLogDateRange;
  readonly severity?: AuditLogSeverity;
}

export type AuditListFilterPatch = {
  readonly [Key in keyof AuditListFilters]?: AuditListFilters[Key] | undefined;
};

export interface AuditDataGridValue extends DataGridContextValue<AuditLog["adminListItem"]> {
  readonly activeCategoryFilter: AuditLogCategoryFilter;
  readonly activeDateRangeFilter: AuditLogDateRange;
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
    category: AUDIT_LOG_CATEGORY_FILTER.ALL,
    dateRange: AUDIT_LOG_DATE_RANGE.ALL
  });
  const [serverSearch, setServerSearch] = useState("");

  const pageQueryOptions = auditLogQueryOptions.adminAuditLogsPageQueryOptions({
    category: resolveAuditLogCategoryFilter(filters.category),
    dateRange: filters.dateRange,
    page: pagination.pageIndex + LIST_PAGE_STEP,
    pageSize: pagination.pageSize,
    search: serverSearch === "" ? undefined : serverSearch,
    severity: filters.severity
  });

  const {
    data = EMPTY_AUDIT_PAGE,
    isPending,
    isPlaceholderData
  } = useQuery({
    ...pageQueryOptions,
    placeholderData: keepPreviousData
  });

  const showSkeletonRows = isPending && !isPlaceholderData;
  const columns = useAuditColumns();
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);
  const pageCount = Math.ceil(data.total / pagination.pageSize);

  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: [...data.items],
    defaultColumnVisibility: AUDIT_LOG_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_AUDIT_LOG_PAGE_SIZE,
    enableRowSelection: false,
    getRowId: (row) => row.id,
    initialColumnOrder,
    manualFiltering: true,
    manualPagination: true,
    onPaginationChange: setPagination,
    pageCount,
    pagination,
    persistenceKey: auditDataGrid.persistenceKey,
    rowCount: data.total
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
      activeDateRangeFilter: filters.dateRange ?? AUDIT_LOG_DATE_RANGE.ALL,
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
      filters.dateRange,
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
