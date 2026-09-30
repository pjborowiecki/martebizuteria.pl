import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, ne } from "drizzle-orm"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CUSTOMER_ACCOUNT_MUTATION_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { session } from "~/src/modules/session/session.schema"

export const revokeOtherCustomerSessions = createServerFn({ method: "POST" })
  .middleware([withRateLimit("revoke-other-customer-sessions", RATE_LIMITS.SENSITIVE), authorized()])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    await db.delete(session).where(and(eq(session.userId, context.auth.user.id), ne(session.id, context.auth.session.id)))

    return { ok: true }
  })

export const revokeOtherCustomerSessionsMutation = mutationOptions({
  mutationFn: () => revokeOtherCustomerSessions(),
  mutationKey: CUSTOMER_ACCOUNT_MUTATION_KEYS.REVOKE_OTHER_SESSIONS,
})
