import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { getCustomerActivityAuditRows } from "~/src/modules/customer-account/customer-account.accessors.server"
import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

export const listCustomerLoginHistory = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }): Promise<readonly CustomerAccount["loginHistoryItem"][]> => {
    const rows = await getCustomerActivityAuditRows(context.auth.user.id)

    return rows
      .filter((row) => row.action === AUDIT_LOG_ACTION.AUTH_LOGIN || row.action === AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED)
      .map(
        (row) =>
          ({
            createdAt: row.createdAt,
            detail: row.detail ?? undefined,
            status: row.action === AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED ? "blocked" : "success",
          }) satisfies CustomerAccount["loginHistoryItem"],
      )
  })

export const listCustomerLoginHistoryQuery = () =>
  queryOptions({
    queryFn: () => listCustomerLoginHistory(),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.LOGIN_HISTORY,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
