import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CUSTOMER_ACCOUNT_MUTATION_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"
import { session } from "~/src/modules/session/session.schema"

export const revokeCustomerSession = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof customerAccountZodSchemas.sessionIdInput>) => customerAccountZodSchemas.sessionIdInput.parse(input))
  .handler(async ({ context, data: { sessionId } }): Promise<boolean> => {
    if (sessionId === context.auth.session.id) {
      return false
    }

    await db.delete(session).where(and(eq(session.id, sessionId), eq(session.userId, context.auth.user.id)))

    return true
  })

export const revokeCustomerSessionMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof revokeCustomerSession>[0]["data"]) => revokeCustomerSession({ data }),
  mutationKey: CUSTOMER_ACCOUNT_MUTATION_KEYS.REVOKE_SESSION,
})
