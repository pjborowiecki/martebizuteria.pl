import { type SQL, and, eq, exists, isNull, ne, sql } from "drizzle-orm"
import { type AnySQLiteColumn } from "drizzle-orm/sqlite-core"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { userEmailHistory } from "~/src/modules/user-email-history/user-email-history.schema"

const historyRowWhere = (condition: SQL | undefined): SQL =>
  exists(db.select({ id: userEmailHistory.id }).from(userEmailHistory).where(condition))

const heldAt = (holder: SQL, { address, at }: AddressAtMoment): SQL => {
  const heldThen = sql`${userEmailHistory.addedAt} <= ${at} and (${userEmailHistory.replacedAt} is null or ${userEmailHistory.replacedAt} > ${at})`

  return historyRowWhere(and(holder, eq(userEmailHistory.email, address), heldThen))
}

export const accountHeldAddressAt = (userId: string, moment: AddressAtMoment): SQL => heldAt(eq(userEmailHistory.userId, userId), moment)

export const anotherAccountHeldAddressAt = (userId: string, moment: AddressAtMoment): SQL =>
  heldAt(ne(userEmailHistory.userId, userId), moment)

export const keyedByFormerAddressOf = (userId: string, { address, at }: AddressAtMoment): SQL => {
  const heldThen = sql`${at} between ${userEmailHistory.addedAt} and ${userEmailHistory.replacedAt}`

  return historyRowWhere(and(eq(userEmailHistory.userId, userId), eq(userEmailHistory.email, address), heldThen))
}

export const getCurrentAddressHolder = (email: string) => {
  const address = email.trim().toLowerCase()

  return db.query.userEmailHistory.findFirst({
    columns: { addedAt: true, userId: true },
    where: and(eq(userEmailHistory.email, address), isNull(userEmailHistory.replacedAt)),
  })
}

interface AddressAtMoment {
  readonly address: AnySQLiteColumn | SQL
  readonly at: AnySQLiteColumn | SQL
}
