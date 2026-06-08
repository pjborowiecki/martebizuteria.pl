import { and, eq, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { address } from "~/src/modules/address/address.schema";
import type { Address } from "~/src/modules/address/address.types";

const FIRST_ROW_INDEX = 0;
const SINGLE_ROW = 1;

const getAllUserAddressesQuery = db.query.address
  .findMany({
    where: eq(address.userId, sql.placeholder("userId"))
  })
  .prepare();

async function getDefaultAddressForUser(userId: string): Promise<Address["select"] | undefined> {
  const rows = await db
    .select()
    .from(address)
    .where(and(eq(address.userId, userId), eq(address.isDefault, true)))
    .limit(SINGLE_ROW);

  return rows[FIRST_ROW_INDEX];
}

interface UpsertDefaultAddressInput {
  readonly address1: string;
  readonly address2?: string;
  readonly city: string;
  readonly countryCode: string;
  readonly postalCode?: string;
  readonly province?: string;
  readonly userId: string;
}

async function upsertDefaultAddressForUser(input: UpsertDefaultAddressInput): Promise<void> {
  const existing = await getDefaultAddressForUser(input.userId);
  const payload: Omit<Address["insert"], "id"> = {
    address1: input.address1,
    city: input.city,
    countryCode: input.countryCode.toUpperCase(),
    isDefault: true,
    userId: input.userId
  };

  if (input.address2 !== undefined && input.address2 !== "") {
    payload.address2 = input.address2;
  }

  if (input.postalCode !== undefined && input.postalCode !== "") {
    payload.postalCode = input.postalCode;
  }

  if (input.province !== undefined && input.province !== "") {
    payload.province = input.province;
  }

  if (existing === undefined) {
    await db.insert(address).values({
      ...payload,
      id: uuidv7()
    } satisfies Address["insert"]);
    return;
  }

  await db.update(address).set(payload).where(eq(address.id, existing.id));
}

interface CreateUserAddressInput {
  readonly address1: string;
  readonly address2?: string;
  readonly city: string;
  readonly countryCode: string;
  readonly firstName?: string;
  readonly isDefault?: boolean;
  readonly lastName?: string;
  readonly phone?: string;
  readonly postalCode?: string;
  readonly province?: string;
  readonly userId: string;
}

interface UpdateUserAddressInput {
  readonly address1?: string;
  readonly address2?: string;
  readonly city?: string;
  readonly countryCode?: string;
  readonly firstName?: string;
  readonly id: string;
  readonly isDefault?: boolean;
  readonly lastName?: string;
  readonly phone?: string;
  readonly postalCode?: string;
  readonly province?: string;
  readonly userId: string;
}

async function clearDefaultAddressesForUser(userId: string): Promise<void> {
  await db.update(address).set({ isDefault: false }).where(eq(address.userId, userId));
}

async function createUserAddress(input: CreateUserAddressInput): Promise<Address["select"]> {
  if (input.isDefault === true) {
    await clearDefaultAddressesForUser(input.userId);
  }

  const id = uuidv7();
  const payload: Address["insert"] = {
    address1: input.address1,
    city: input.city,
    countryCode: input.countryCode.toUpperCase(),
    id,
    isDefault: input.isDefault ?? false,
    userId: input.userId
  };

  if (input.address2 !== undefined && input.address2 !== "") {
    payload.address2 = input.address2;
  }

  if (input.firstName !== undefined && input.firstName !== "") {
    payload.firstName = input.firstName;
  }

  if (input.lastName !== undefined && input.lastName !== "") {
    payload.lastName = input.lastName;
  }

  if (input.phone !== undefined && input.phone !== "") {
    payload.phone = input.phone;
  }

  if (input.postalCode !== undefined && input.postalCode !== "") {
    payload.postalCode = input.postalCode;
  }

  if (input.province !== undefined && input.province !== "") {
    payload.province = input.province;
  }

  await db.insert(address).values(payload);

  const rows = await db.select().from(address).where(eq(address.id, id)).limit(SINGLE_ROW);
  return rows[FIRST_ROW_INDEX];
}

function clearableOptionalText(value: string): string | ReturnType<typeof sql> {
  return value === "" ? sql`NULL` : value;
}

function buildAddressUpdatePayload(input: UpdateUserAddressInput): Partial<Address["insert"]> {
  const payload: Record<string, unknown> = {};
  const clearableFields = {
    address2: input.address2,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    postalCode: input.postalCode,
    province: input.province
  } as const;

  if (input.address1 !== undefined) {
    payload.address1 = input.address1;
  }

  if (input.city !== undefined) {
    payload.city = input.city;
  }

  if (input.countryCode !== undefined) {
    payload.countryCode = input.countryCode.toUpperCase();
  }

  if (input.isDefault !== undefined) {
    payload.isDefault = input.isDefault;
  }

  for (const [field, value] of Object.entries(clearableFields)) {
    if (value !== undefined) {
      payload[field] = clearableOptionalText(value);
    }
  }

  return payload as Partial<Address["insert"]>;
}

async function updateUserAddress(input: UpdateUserAddressInput): Promise<Address["select"] | undefined> {
  const existing = await db
    .select()
    .from(address)
    .where(and(eq(address.id, input.id), eq(address.userId, input.userId)))
    .limit(SINGLE_ROW);

  if (existing[FIRST_ROW_INDEX] === undefined) {
    return;
  }

  if (input.isDefault === true) {
    await clearDefaultAddressesForUser(input.userId);
  }

  await db
    .update(address)
    .set(buildAddressUpdatePayload(input))
    .where(and(eq(address.id, input.id), eq(address.userId, input.userId)));

  const rows = await db.select().from(address).where(eq(address.id, input.id)).limit(SINGLE_ROW);
  return rows[FIRST_ROW_INDEX];
}

async function deleteUserAddress(userId: string, addressId: string): Promise<boolean> {
  const existing = await db
    .select()
    .from(address)
    .where(and(eq(address.id, addressId), eq(address.userId, userId)))
    .limit(SINGLE_ROW);

  if (existing[FIRST_ROW_INDEX] === undefined) {
    return false;
  }

  await db.delete(address).where(and(eq(address.id, addressId), eq(address.userId, userId)));
  return true;
}

async function setDefaultUserAddress(userId: string, addressId: string): Promise<boolean> {
  const existing = await db
    .select()
    .from(address)
    .where(and(eq(address.id, addressId), eq(address.userId, userId)))
    .limit(SINGLE_ROW);

  if (existing[FIRST_ROW_INDEX] === undefined) {
    return false;
  }

  await clearDefaultAddressesForUser(userId);
  await db
    .update(address)
    .set({ isDefault: true })
    .where(and(eq(address.id, addressId), eq(address.userId, userId)));
  return true;
}

export const addressAccessors = {
  createUserAddress,
  deleteUserAddress,
  getAllUserAddressesQuery,
  getDefaultAddressForUser,
  setDefaultUserAddress,
  updateUserAddress,
  upsertDefaultAddressForUser
};
