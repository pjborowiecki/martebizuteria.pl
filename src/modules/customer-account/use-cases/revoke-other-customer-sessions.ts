import { createServerFn } from "@tanstack/react-start"
import { and, eq, ne } from "drizzle-orm"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { session } from "~/src/modules/session/session.schema"

export const revokeOtherCustomerSessionsFn = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: true }> => {
  const authSession = await getRequestSession()
  if (authSession?.user === undefined) {
    return { ok: true }
  }

  await db.delete(session).where(and(eq(session.userId, authSession.user.id), ne(session.id, authSession.session.id)))
  return { ok: true }
})
