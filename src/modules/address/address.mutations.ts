import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";

import { CONSTANTS } from "~/src/constants";

import { auth } from "~/src/integrations/better-auth/auth._server";

import { addressAccessors } from "~/src/modules/address/address.accessors";

const MIN_FIELD_LENGTH = 1;
const COUNTRY_CODE_LENGTH = 2;

const addressFieldsSchema = z.object({
  address1: z.string().min(MIN_FIELD_LENGTH),
  address2: z.string().optional(),
  city: z.string().min(MIN_FIELD_LENGTH),
  countryCode: z.string().length(COUNTRY_CODE_LENGTH),
  firstName: z.string().optional(),
  isDefault: z.boolean().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  postalCode: z.string().optional(),
  province: z.string().optional()
});

const addressIdInputSchema = z.object({
  addressId: z.string().min(MIN_FIELD_LENGTH)
});

async function requireUserId(): Promise<string | undefined> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  return session?.user.id;
}

const createUserAddressFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => addressFieldsSchema.parse(data))
  .handler(async (ctx) => {
    const userId = await requireUserId();
    if (userId === undefined) {
      throw new Error("Unauthorized");
    }

    return addressAccessors.createUserAddress({ ...ctx.data, userId });
  });

const updateUserAddressFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => addressFieldsSchema.extend({ addressId: z.string().min(MIN_FIELD_LENGTH) }).parse(data))
  .handler(async ({ data: { addressId, ...fields } }) => {
    const userId = await requireUserId();
    if (userId === undefined) {
      throw new Error("Unauthorized");
    }

    const updated = await addressAccessors.updateUserAddress({ ...fields, id: addressId, userId });
    if (updated === undefined) {
      throw new Error("Address not found");
    }

    return updated;
  });

const deleteUserAddressFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => addressIdInputSchema.parse(data))
  .handler(async ({ data: { addressId } }) => {
    const userId = await requireUserId();
    if (userId === undefined) {
      throw new Error("Unauthorized");
    }

    const deleted = await addressAccessors.deleteUserAddress(userId, addressId);
    if (!deleted) {
      throw new Error("Address not found");
    }

    return { ok: true as const };
  });

const setDefaultUserAddressFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => addressIdInputSchema.parse(data))
  .handler(async ({ data: { addressId } }) => {
    const userId = await requireUserId();
    if (userId === undefined) {
      throw new Error("Unauthorized");
    }

    const updated = await addressAccessors.setDefaultUserAddress(userId, addressId);
    if (!updated) {
      throw new Error("Address not found");
    }

    return { ok: true as const };
  });

export const addressMutations = {
  createUserAddressFn,
  deleteUserAddressFn,
  setDefaultUserAddressFn,
  updateUserAddressFn
};

export const addressMutationKeys = {
  all: CONSTANTS.QUERY_KEYS.ADDRESS.ALL
};
