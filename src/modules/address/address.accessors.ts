import { type SQL, and, eq, sql } from "drizzle-orm"
import { type SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core"
import { v7 as uuidv7 } from "uuid"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { address } from "~/src/modules/address/address.schema"
import { type Address } from "~/src/modules/address/address.types"

export const getDefaultAddressForUser = async (userId: string): Promise<Address["select"] | undefined> => {
  const rows = await db
    .select()
    .from(address)
    .where(and(eq(address.userId, userId), eq(address.isDefault, true)))
    .limit(1)
  return rows[0]
}

export const upsertDefaultAddressForUser = async (input: UpsertDefaultAddressInput): Promise<void> => {
  const existing = await getDefaultAddressForUser(input.userId)
  const payload: Omit<Address["insert"], "id"> = {
    address1: input.address1,
    city: input.city,
    countryCode: input.countryCode.toUpperCase(),
    isDefault: true,
    userId: input.userId,
  }

  if (input.address2 !== undefined && input.address2 !== "") {
    payload.address2 = input.address2
  }

  if (input.postalCode !== undefined && input.postalCode !== "") {
    payload.postalCode = input.postalCode
  }

  if (input.province !== undefined && input.province !== "") {
    payload.province = input.province
  }

  if (existing === undefined) {
    await db.insert(address).values({
      ...payload,
      id: uuidv7(),
    } satisfies Address["insert"])

    return
  }
  await db.update(address).set(payload).where(eq(address.id, existing.id))
}

const clearDefaultAddressesForUser = async (userId: string): Promise<void> => {
  await db
    .update(address)
    .set({
      isDefault: false,
    })
    .where(eq(address.userId, userId))
}

const OPTIONAL_ADDRESS_TEXT_FIELDS = ["address2", "firstName", "lastName", "phone", "postalCode", "province"] as const

export const createUserAddress = async (input: CreateUserAddressInput): Promise<Address["select"]> => {
  if (input.isDefault === true) {
    await clearDefaultAddressesForUser(input.userId)
  }

  const id = uuidv7()
  const payload: Address["insert"] = {
    address1: input.address1,
    city: input.city,
    countryCode: input.countryCode.toUpperCase(),
    id,
    isDefault: input.isDefault ?? false,
    userId: input.userId,
  }

  for (const field of OPTIONAL_ADDRESS_TEXT_FIELDS) {
    const value = input[field]
    if (value !== undefined && value !== "") {
      payload[field] = value
    }
  }
  await db.insert(address).values(payload)
  const [created] = await db.select().from(address).where(eq(address.id, id)).limit(1)
  if (created === undefined) {
    throw new Error("Created address could not be loaded")
  }

  return created
}

const clearableOptionalText = (value: string): string | SQL => (value === "" ? sql`NULL` : value)

const buildAddressUpdatePayload = (input: UpdateUserAddressInput): SQLiteUpdateSetSource<typeof address> => {
  const payload: SQLiteUpdateSetSource<typeof address> = {}
  if (input.address1 !== undefined) {
    payload.address1 = input.address1
  }

  if (input.city !== undefined) {
    payload.city = input.city
  }

  if (input.countryCode !== undefined) {
    payload.countryCode = input.countryCode.toUpperCase()
  }

  if (input.isDefault !== undefined) {
    payload.isDefault = input.isDefault
  }

  for (const field of OPTIONAL_ADDRESS_TEXT_FIELDS) {
    const value = input[field]
    if (value !== undefined) {
      payload[field] = clearableOptionalText(value)
    }
  }

  return payload
}

export const updateUserAddress = async (input: UpdateUserAddressInput): Promise<Address["select"] | undefined> => {
  const existing = await db
    .select()
    .from(address)
    .where(and(eq(address.id, input.id), eq(address.userId, input.userId)))
    .limit(1)
  if (existing[0] === undefined) {
    return undefined
  }

  if (input.isDefault === true) {
    await clearDefaultAddressesForUser(input.userId)
  }
  await db
    .update(address)
    .set(buildAddressUpdatePayload(input))
    .where(and(eq(address.id, input.id), eq(address.userId, input.userId)))
  const rows = await db.select().from(address).where(eq(address.id, input.id)).limit(1)

  return rows[0]
}

export const deleteUserAddress = async (userId: string, addressId: string): Promise<boolean> => {
  const existing = await db
    .select()
    .from(address)
    .where(and(eq(address.id, addressId), eq(address.userId, userId)))
    .limit(1)
  if (existing[0] === undefined) {
    return false
  }
  await db.delete(address).where(and(eq(address.id, addressId), eq(address.userId, userId)))

  return true
}

export const setDefaultUserAddress = async (userId: string, addressId: string): Promise<boolean> => {
  const existing = await db
    .select()
    .from(address)
    .where(and(eq(address.id, addressId), eq(address.userId, userId)))
    .limit(1)
  if (existing[0] === undefined) {
    return false
  }
  await clearDefaultAddressesForUser(userId)
  await db
    .update(address)
    .set({
      isDefault: true,
    })
    .where(and(eq(address.id, addressId), eq(address.userId, userId)))
  return true
}

interface UpsertDefaultAddressInput {
  readonly address1: string
  readonly address2?: string | undefined
  readonly city: string
  readonly countryCode: string
  readonly postalCode?: string | undefined
  readonly province?: string | undefined
  readonly userId: string
}

interface CreateUserAddressInput {
  readonly address1: string
  readonly address2?: string | undefined
  readonly city: string
  readonly countryCode: string
  readonly firstName?: string | undefined
  readonly isDefault?: boolean | undefined
  readonly lastName?: string | undefined
  readonly phone?: string | undefined
  readonly postalCode?: string | undefined
  readonly province?: string | undefined
  readonly userId: string
}

interface UpdateUserAddressInput {
  readonly address1?: string | undefined
  readonly address2?: string | undefined
  readonly city?: string | undefined
  readonly countryCode?: string | undefined
  readonly firstName?: string | undefined
  readonly id: string
  readonly isDefault?: boolean | undefined
  readonly lastName?: string | undefined
  readonly phone?: string | undefined
  readonly postalCode?: string | undefined
  readonly province?: string | undefined
  readonly userId: string
}
