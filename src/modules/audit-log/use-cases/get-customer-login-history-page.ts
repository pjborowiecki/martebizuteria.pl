import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/_core/constants/customer-account"
import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/modules/_core/utils/pagination"
import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { getCustomerLoginAuditPage } from "~/src/modules/audit-log/audit-log.accessors"
import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_QUERY_KEYS,
  CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE,
  CUSTOMER_ACCOUNT_LOGIN_STATUS,
} from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"

export const getCustomerLoginHistoryPage = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof auditLogZodSchemas.customerLoginHistoryPageInput>) =>
    auditLogZodSchemas.customerLoginHistoryPageInput.parse(input),
  )
  .handler(async ({ context, data }) => {
    const params = listPaginationParamsFromPage(data.page ?? LIST_PAGE_FIRST, data.pageSize ?? CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE)
    const { rows, total } = await getCustomerLoginAuditPage({
      ...params,
      search: normalizeAdminSearchTerm(data.search),
      status: data.status,
      userId: context.auth.user.id,
    })

    return buildListPaginationResult(
      rows.map((row): AuditLog["customerLoginHistoryItem"] => ({
        createdAt: row.createdAt,
        id: row.id,
        ipAddress: row.ip ?? undefined,
        status:
          row.action === AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED ? CUSTOMER_ACCOUNT_LOGIN_STATUS.FAILED : CUSTOMER_ACCOUNT_LOGIN_STATUS.SUCCESS,
      })),
      total,
      params,
    )
  })

export const getCustomerLoginHistoryPageQuery = (input: zod.input<typeof auditLogZodSchemas.customerLoginHistoryPageInput>) =>
  queryOptions({
    queryFn: () => getCustomerLoginHistoryPage({ data: input }),
    queryKey: [...AUDIT_LOG_QUERY_KEYS.CUSTOMER.LOGIN_HISTORY, input],
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
