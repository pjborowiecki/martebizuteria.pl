import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, gt } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/_core/constants/customer-account"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { session } from "~/src/modules/session/session.schema"
import { type Session } from "~/src/modules/session/session.types"
import { parseUserAgent } from "~/src/modules/session/session.utils"

export const listCustomerSessions = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }): Promise<readonly Session["customerSession"][]> => {
    const now = new Date()
    const rows = await db
      .select()
      .from(session)
      .where(and(eq(session.userId, context.auth.user.id), gt(session.expiresAt, now)))
      .orderBy(desc(session.updatedAt))

    return rows.map((row) => {
      const parsed = parseUserAgent(row.userAgent)

      return {
        browser: parsed.browser,
        createdAt: row.createdAt,
        device: parsed.device,
        deviceType: parsed.deviceType,
        id: row.id,
        ipAddress: row.ipAddress ?? undefined,
        isCurrent: row.id === context.auth.session.id,
        lastActiveAt: row.updatedAt,
      } satisfies Session["customerSession"]
    })
  })

export const listCustomerSessionsQuery = () =>
  queryOptions({
    queryFn: () => listCustomerSessions(),
    queryKey: SESSION_QUERY_KEYS.CUSTOMER.SESSIONS,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
