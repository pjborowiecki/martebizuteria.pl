import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import {
  type AdminAuditLogsListParams,
  getAdminAuditLogsPage as auditLogGetAdminAuditLogsPage,
} from "~/src/modules/audit-log/audit-log.accessors"
import {
  ADMIN_AUDIT_LOG_PAGE_SIZE,
  AUDIT_LOG_QUERY_KEYS,
  AUDIT_LOG_QUERY_STALE_MS,
  type AuditLogCategory,
  type AuditLogSeverity,
} from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { toAdminAuditListItem } from "~/src/modules/audit-log/audit-log.utils"

import { type DateTimeColumnFilterValue } from "~/src/lib/admin-datetime-filter"
import { normalizeAdminSearchTerm } from "~/src/lib/admin-search.server"
import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/lib/list-pagination"

export interface AdminAuditLogsPageInput {
  readonly category?: AuditLogCategory | undefined
  readonly createdAt?: DateTimeColumnFilterValue | undefined
  readonly page?: number | undefined
  readonly pageSize?: number | undefined
  readonly search?: string | undefined
  readonly severity?: AuditLogSeverity | undefined
}

const buildAdminAuditLogsListParams = (input: AdminAuditLogsPageInput): AdminAuditLogsListParams => {
  const pageSize = input.pageSize ?? ADMIN_AUDIT_LOG_PAGE_SIZE

  return {
    ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, pageSize),
    category: input.category,
    createdAt: input.createdAt,
    search: normalizeAdminSearchTerm(input.search),
    severity: input.severity,
  }
}

export interface AdminAuditLogsPageResult {
  readonly hasMore: boolean
  readonly items: readonly AuditLog["adminListItem"][]
  readonly limit: number
  readonly offset: number
  readonly total?: number
}

const buildAdminAuditLogsPageResult = (
  items: readonly AuditLog["adminListItem"][],
  total: number | undefined,
  params: ReturnType<typeof buildAdminAuditLogsListParams>,
): AdminAuditLogsPageResult => {
  const hasMore = total === undefined ? items.length === params.limit : params.offset + items.length < total

  if (total === undefined) {
    return {
      hasMore,
      items,
      limit: params.limit,
      offset: params.offset,
    }
  }

  return buildListPaginationResult(items, total, params)
}

export const fetchAdminAuditLogsPageFn = createServerFn({ method: "GET" })
  .validator((input: AdminAuditLogsPageInput) => input)
  .handler(async ({ data }): Promise<AdminAuditLogsPageResult> => {
    await assertAdmin()
    const params = buildAdminAuditLogsListParams(data)
    const { rows, total } = await auditLogGetAdminAuditLogsPage(params)
    const items = rows.map((row) => toAdminAuditListItem(row))
    return buildAdminAuditLogsPageResult(items, total, params)
  })

export const adminAuditLogsPageQueryOptions = (input: AdminAuditLogsPageInput) =>
  queryOptions({
    queryFn: () => fetchAdminAuditLogsPageFn({ data: input }),
    queryKey: [...AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, input] as const,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: AUDIT_LOG_QUERY_STALE_MS,
  })
