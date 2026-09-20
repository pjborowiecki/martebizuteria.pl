import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"
import { session } from "~/src/modules/session/session.schema"

export const revokeCustomerSessionFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => customerAccountZodSchemas.sessionIdInput.parse(data))
  .handler(async ({ data: { sessionId } }): Promise<boolean> => {
    const authSession = await getRequestSession()
    if (authSession?.user === undefined) {
      return false
    }

    if (sessionId === authSession.session.id) {
      return false
    }

    await db.delete(session).where(and(eq(session.id, sessionId), eq(session.userId, authSession.user.id)))
    return true
  })
