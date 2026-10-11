import { inArray, lt } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { session } from "~/src/modules/session/session.schema"

export const deleteExpiredSessions = async ({ expiredBefore, limit }: DeleteExpiredSessionsInput): Promise<number> => {
  const expired = db.select({ id: session.id }).from(session).where(lt(session.expiresAt, expiredBefore)).limit(limit)
  const deleted = await db.delete(session).where(inArray(session.id, expired)).returning({ id: session.id })

  return deleted.length
}

export interface DeleteExpiredSessionsInput {
  readonly expiredBefore: Date
  readonly limit: number
}
