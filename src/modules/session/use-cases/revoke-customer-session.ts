import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordAuthSessionsRevokedAudit, resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.events.server"
import { SESSION_MUTATION_KEYS } from "~/src/modules/session/session.constants"
import { session } from "~/src/modules/session/session.schema"
import { sessionZodSchemas } from "~/src/modules/session/session.zod"

import { resolveRequestIp } from "~/src/lib/request"

export const revokeCustomerSession = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof sessionZodSchemas.sessionIdInput>) => sessionZodSchemas.sessionIdInput.parse(input))
  .handler(async ({ context, data: { sessionId } }): Promise<boolean> => {
    if (sessionId === context.auth.session.id) {
      return false
    }

    const [revoked] = await db
      .delete(session)
      .where(and(eq(session.id, sessionId), eq(session.userId, context.auth.user.id)))
      .returning({ id: session.id })
    if (revoked !== undefined) {
      recordAuthSessionsRevokedAudit(resolveAuthAuditActor(context.auth.user), { ip: resolveRequestIp(context.requestHeaders) })
    }

    return true
  })

export const revokeCustomerSessionMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof revokeCustomerSession>[0]["data"]) => revokeCustomerSession({ data }),
  mutationKey: SESSION_MUTATION_KEYS.REVOKE_SESSION,
})
