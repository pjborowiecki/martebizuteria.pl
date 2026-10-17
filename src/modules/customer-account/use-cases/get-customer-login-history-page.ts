import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/modules/_core/utils/pagination"
import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { getCustomerLoginAuditPage } from "~/src/modules/customer-account/customer-account.accessors.server"
import {
  CUSTOMER_ACCOUNT_LOGIN_HISTORY_PAGE_SIZE,
  CUSTOMER_ACCOUNT_LOGIN_STATUS,
  CUSTOMER_ACCOUNT_QUERY_KEYS,
  CUSTOMER_ACCOUNT_QUERY_STALE_MS,
} from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"

export const getCustomerLoginHistoryPage = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof customerAccountZodSchemas.loginHistoryPageInput>) =>
    customerAccountZodSchemas.loginHistoryPageInput.parse(input),
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
      rows.map((row): CustomerAccount["loginHistoryItem"] => ({
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

export const getCustomerLoginHistoryPageQuery = (input: zod.input<typeof customerAccountZodSchemas.loginHistoryPageInput>) =>
  queryOptions({
    queryFn: () => getCustomerLoginHistoryPage({ data: input }),
    queryKey: [...CUSTOMER_ACCOUNT_QUERY_KEYS.LOGIN_HISTORY, input],
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
