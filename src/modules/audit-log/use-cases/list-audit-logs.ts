import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/modules/_core/utils/pagination"
import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import {
  type AdminAuditLogsListParams,
  getAdminAuditLogsPage as auditLogGetAdminAuditLogsPage,
} from "~/src/modules/audit-log/audit-log.accessors"
import { ADMIN_AUDIT_LOG_PAGE_SIZE, AUDIT_LOG_QUERY_KEYS, AUDIT_LOG_QUERY_STALE_MS } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { toAdminAuditListItem } from "~/src/modules/audit-log/audit-log.utils"
import { auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"

const buildAdminAuditLogsListParams = (input: zod.output<typeof auditLogZodSchemas.adminAuditLogsPageInput>): AdminAuditLogsListParams => {
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

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof auditLogZodSchemas.adminAuditLogsPageInput>) =>
    auditLogZodSchemas.adminAuditLogsPageInput.parse(input),
  )
  .handler(async ({ data }): Promise<AdminAuditLogsPageResult> => {
    const params = buildAdminAuditLogsListParams(data)
    const { rows, total } = await auditLogGetAdminAuditLogsPage(params)
    const items = rows.map((row) => toAdminAuditListItem(row))

    return buildAdminAuditLogsPageResult(items, total, params)
  })

export const listAuditLogsQuery = (input: zod.input<typeof auditLogZodSchemas.adminAuditLogsPageInput>) =>
  queryOptions({
    queryFn: () => listAuditLogs({ data: input }),
    queryKey: [...AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, input],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: AUDIT_LOG_QUERY_STALE_MS,
  })
