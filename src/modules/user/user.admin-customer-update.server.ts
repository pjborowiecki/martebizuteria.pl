import { eq, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { addressAccessors } from "~/src/modules/address/address.accessors";
import { userAccessors } from "~/src/modules/user/user.accessors";
import { USER_ERROR_CODES } from "~/src/modules/user/user.constants";
import { serializeAdminUserMetadata } from "~/src/modules/user/user.metadata.utils";
import { user } from "~/src/modules/user/user.schema";
import type { User } from "~/src/modules/user/user.types";

function hasAddressInput(values: User["adminCustomerFormValues"]): values is User["adminCustomerFormValues"] & {
  address: NonNullable<User["adminCustomerFormValues"]["address"]>;
} {
  const addressInput = values.address;
  if (addressInput === undefined) {
    return false;
  }

  return addressInput.address1.trim() !== "" && addressInput.city.trim() !== "";
}

export async function updateAdminCustomer(input: {
  readonly id: string;
  readonly values: User["adminCustomerFormValues"];
}): Promise<{ ok: true }> {
  const targetUser = await userAccessors.getUserById(input.id);
  if (targetUser === undefined) {
    throw new Error(USER_ERROR_CODES.NOT_FOUND);
  }

  const phone = input.values.phone?.trim();
  const metadata = serializeAdminUserMetadata({
    notes: input.values.notes,
    tags: input.values.customTags
  });

  await db
    .update(user)
    .set({
      metadata: metadata ?? sql`null`,
      phone: phone === "" || phone === undefined ? sql`null` : phone
    })
    .where(eq(user.id, input.id));

  if (hasAddressInput(input.values)) {
    const addressValues = input.values.address;
    let countryCode = addressValues.countryCode.trim().toUpperCase();

    if (countryCode === "") {
      const existingAddress = await addressAccessors.getDefaultAddressForUser(input.id);
      countryCode = existingAddress?.countryCode ?? "";
    }

    if (countryCode !== "") {
      await addressAccessors.upsertDefaultAddressForUser({
        address1: addressValues.address1.trim(),
        address2: addressValues.address2?.trim(),
        city: addressValues.city.trim(),
        countryCode,
        postalCode: addressValues.postalCode?.trim(),
        province: addressValues.province?.trim(),
        userId: input.id
      });
    }
  }

  return { ok: true };
}
