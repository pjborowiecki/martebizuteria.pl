import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, ne } from "drizzle-orm"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordAuthSessionsRevokedAudit, resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.events.server"
import { CUSTOMER_ACCOUNT_MUTATION_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { session } from "~/src/modules/session/session.schema"

import { resolveRequestIp } from "~/src/lib/request"

export const revokeOtherCustomerSessions = createServerFn({ method: "POST" })
  .middleware([withRateLimit("revoke-other-customer-sessions", RATE_LIMITS.SENSITIVE), authorized()])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const revoked = await db
      .delete(session)
      .where(and(eq(session.userId, context.auth.user.id), ne(session.id, context.auth.session.id)))
      .returning({ id: session.id })
    if (revoked.length > 0) {
      recordAuthSessionsRevokedAudit(resolveAuthAuditActor(context.auth.user), { ip: resolveRequestIp(context.requestHeaders) })
    }

    return { ok: true }
  })

export const revokeOtherCustomerSessionsMutation = mutationOptions({
  mutationFn: () => revokeOtherCustomerSessions(),
  mutationKey: CUSTOMER_ACCOUNT_MUTATION_KEYS.REVOKE_OTHER_SESSIONS,
})
