import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccountSession } from "~/src/modules/customer-account/customer-account.types"
import { parseUserAgent } from "~/src/modules/customer-account/customer-account.utils"
import { session } from "~/src/modules/session/session.schema"

export const fetchCustomerSessionsFn = createServerFn({ method: "GET" }).handler(async (): Promise<readonly CustomerAccountSession[]> => {
  const authSession = await getRequestSession()
  if (authSession?.user === undefined) {
    return []
  }

  const rows = await db.select().from(session).where(eq(session.userId, authSession.user.id)).orderBy(desc(session.updatedAt))

  return rows.map((row) => {
    const parsed = parseUserAgent(row.userAgent)
    return {
      browser: parsed.browser,
      createdAt: row.createdAt,
      device: parsed.device,
      deviceType: parsed.deviceType,
      id: row.id,
      ipAddress: row.ipAddress ?? undefined,
      isCurrent: row.id === authSession.session.id,
      lastActiveAt: row.updatedAt,
    } satisfies CustomerAccountSession
  })
})

export const sessionsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchCustomerSessionsFn(),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
