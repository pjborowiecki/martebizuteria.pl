import { type SQL, and, desc, eq, exists, inArray, isNull, ne, sql } from "drizzle-orm"
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

export const keyedByFormerAddressOf = (userId: SQL | string, { address, at }: AddressAtMoment): SQL => {
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

export const getUserEmailHistory = (userId: string) =>
  db
    .select({ addedAt: userEmailHistory.addedAt, email: userEmailHistory.email, replacedAt: userEmailHistory.replacedAt })
    .from(userEmailHistory)
    .where(eq(userEmailHistory.userId, userId))
    .orderBy(desc(userEmailHistory.addedAt), desc(userEmailHistory.id))

export const accountsWithAddressContaining = (term: string) =>
  db
    .selectDistinct({ userId: userEmailHistory.userId })
    .from(userEmailHistory)
    .where(sql`instr(${userEmailHistory.email}, ${term.toLowerCase()}) > 0`)

export const addressesOfAccountsWithAddressContaining = (term: string) =>
  db
    .selectDistinct({ email: userEmailHistory.email })
    .from(userEmailHistory)
    .where(inArray(userEmailHistory.userId, accountsWithAddressContaining(term)))

interface AddressAtMoment {
  readonly address: AnySQLiteColumn | SQL
  readonly at: AnySQLiteColumn | SQL
}
