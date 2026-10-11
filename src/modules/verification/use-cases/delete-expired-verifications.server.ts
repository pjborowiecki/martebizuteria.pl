import { inArray, lt } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { verification } from "~/src/modules/verification/verification.schema"

export const deleteExpiredVerifications = async ({ expiredBefore, limit }: DeleteExpiredVerificationsInput): Promise<number> => {
  const expired = db.select({ id: verification.id }).from(verification).where(lt(verification.expiresAt, expiredBefore)).limit(limit)
  const deleted = await db.delete(verification).where(inArray(verification.id, expired)).returning({ id: verification.id })

  return deleted.length
}

export interface DeleteExpiredVerificationsInput {
  readonly expiredBefore: Date
  readonly limit: number
}
