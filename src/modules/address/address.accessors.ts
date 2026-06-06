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

export const addressAccessors = {
  getAllUserAddressesQuery,
  getDefaultAddressForUser,
  upsertDefaultAddressForUser
};
