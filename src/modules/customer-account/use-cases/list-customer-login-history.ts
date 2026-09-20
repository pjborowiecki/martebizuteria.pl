import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { getCustomerActivityAuditRows } from "~/src/modules/customer-account/customer-account.accessors.server"
import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccountLoginHistoryItem } from "~/src/modules/customer-account/customer-account.types"

export const fetchCustomerLoginHistoryFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<readonly CustomerAccountLoginHistoryItem[]> => {
    const authSession = await getRequestSession()
    if (authSession?.user === undefined) {
      return []
    }

    const rows = await getCustomerActivityAuditRows(authSession.user.id)

    return rows
      .filter((row) => row.action === AUDIT_LOG_ACTION.AUTH_LOGIN || row.action === AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED)
      .map(
        (row) =>
          ({
            createdAt: row.createdAt,
            detail: row.detail ?? undefined,
            status: row.action === AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED ? "blocked" : "success",
          }) satisfies CustomerAccountLoginHistoryItem,
      )
  },
)

export const loginHistoryQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchCustomerLoginHistoryFn(),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.LOGIN_HISTORY,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
