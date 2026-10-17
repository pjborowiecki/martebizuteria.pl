import { eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { verification } from "~/src/modules/verification/verification.schema"

export const deleteVerificationsOfUser = async (userId: string): Promise<void> => {
  await db.delete(verification).where(eq(verification.value, userId))
}
