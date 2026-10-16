import { eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { account } from "~/src/modules/account/account.schema"

export const listAccountProviderIds = async (userId: string): Promise<readonly string[]> => {
  const rows = await db.query.account.findMany({
    columns: { providerId: true },
    where: eq(account.userId, userId),
  })

  return rows.map((row) => row.providerId)
}
