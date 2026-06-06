import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { normalizeAdminSearchTerm } from "~/src/lib/_utils/admin-search.server";
import { buildListPaginationResult, LIST_PAGE_FIRST, listPaginationParamsFromPage } from "~/src/lib/_utils/list-pagination";

import { auditLogAccessors, type AdminAuditLogsListParams } from "~/src/modules/audit-log/audit-log.accessors";
import {
  ADMIN_AUDIT_LOG_PAGE_SIZE,
  AUDIT_LOG_QUERY_STALE_MS,
  type AuditLogCategory,
  type AuditLogDateRange,
  type AuditLogSeverity
} from "~/src/modules/audit-log/audit-log.constants";
import type { AuditLog } from "~/src/modules/audit-log/audit-log.types";
import { resolveAuditLogSince, resolveStartOfToday, toAdminAuditListItem } from "~/src/modules/audit-log/audit-log.utils";

export interface AdminAuditLogsPageInput {
  readonly category?: AuditLogCategory;
  readonly dateRange?: AuditLogDateRange;
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly severity?: AuditLogSeverity;
}

function buildAdminAuditLogsListParams(input: AdminAuditLogsPageInput): AdminAuditLogsListParams {
  const pageSize = input.pageSize ?? ADMIN_AUDIT_LOG_PAGE_SIZE;

  return {
    ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, pageSize),
    category: input.category,
    search: normalizeAdminSearchTerm(input.search),
    severity: input.severity,
    since: resolveAuditLogSince(input.dateRange)
  };
}

async function getAdminAuditLogsPage(input: AdminAuditLogsPageInput) {
  const params = buildAdminAuditLogsListParams(input);
  const { rows, total } = await auditLogAccessors.getAdminAuditLogsPage(params);
  const items = rows.map((row) => toAdminAuditListItem(row));

  return buildListPaginationResult(items, total, params);
}

function getAdminAuditLogStats(): Promise<AuditLog["stats"]> {
  return auditLogAccessors.getAdminAuditLogStats(resolveStartOfToday());
}

const fetchAdminAuditLogsPageFn = createServerFn({ method: "GET" })
  .inputValidator((input: AdminAuditLogsPageInput) => input)
  .handler(({ data }) => getAdminAuditLogsPage(data));

const fetchAdminAuditLogStatsFn = createServerFn({ method: "GET" }).handler(() => getAdminAuditLogStats());

export const auditLogQueries = {
  fetchAdminAuditLogStatsFn,
  fetchAdminAuditLogsPageFn
};

export const auditLogQueryOptions = {
  adminAuditLogStatsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchAdminAuditLogStatsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.AUDIT_LOG.ADMIN.STATS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: AUDIT_LOG_QUERY_STALE_MS
    }),
  adminAuditLogsPageQueryOptions: (input: AdminAuditLogsPageInput) =>
    queryOptions({
      queryFn: () => fetchAdminAuditLogsPageFn({ data: input }),
      queryKey: [...CONSTANTS.QUERY_KEYS.AUDIT_LOG.ADMIN.PAGE, input] as const,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: AUDIT_LOG_QUERY_STALE_MS
    })
};
