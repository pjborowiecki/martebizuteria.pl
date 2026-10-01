import { and, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CREDENTIAL_PROVIDER_ID } from "~/src/modules/account/account.constants"
import { account } from "~/src/modules/account/account.schema"

export const hasCredentialAccount = async (userId: string): Promise<boolean> => {
  const row = await db.query.account.findFirst({
    columns: { id: true },
    where: and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)),
  })

  return row !== undefined
}
