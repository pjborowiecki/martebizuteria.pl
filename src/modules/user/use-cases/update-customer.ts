import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { getDefaultAddressForUser, upsertDefaultAddressForUser } from "~/src/modules/address/address.accessors"
import { getUserById } from "~/src/modules/user/user.accessors"
import { USER_ERROR_CODES } from "~/src/modules/user/user.constants"
import { serializeAdminUserMetadata } from "~/src/modules/user/user.metadata.utils"
import { user } from "~/src/modules/user/user.schema"
import { type User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"
const hasAddressInput = (
  values: User["adminCustomerFormValues"],
): values is User["adminCustomerFormValues"] & {
  address: NonNullable<User["adminCustomerFormValues"]["address"]>
} => {
  const addressInput = values.address
  if (addressInput === undefined) {
    return false
  }
  return addressInput.address1.trim() !== "" && addressInput.city.trim() !== ""
}
export const updateAdminCustomerFn = createServerFn({
  method: "POST",
})
  .validator((data: unknown) => userZodSchemas.updateAdminCustomerInput.parse(data))
  .handler(
    async ({
      data: input,
    }): Promise<{
      ok: true
    }> => {
      await assertAdmin()
      const targetUser = await getUserById(input.id)
      if (targetUser === undefined) {
        throw new Error(USER_ERROR_CODES.NOT_FOUND)
      }
      const phone = input.values.phone?.trim()
      const metadata = serializeAdminUserMetadata({
        notes: input.values.notes,
        tags: input.values.customTags,
      })
      await db
        .update(user)
        .set({
          metadata: metadata ?? sql`null`,
          phone: phone === "" || phone === undefined ? sql`null` : phone,
        })
        .where(eq(user.id, input.id))
      if (hasAddressInput(input.values)) {
        const addressValues = input.values.address
        let countryCode = addressValues.countryCode.trim().toUpperCase()
        if (countryCode === "") {
          const existingAddress = await getDefaultAddressForUser(input.id)
          countryCode = existingAddress?.countryCode ?? ""
        }
        if (countryCode !== "") {
          await upsertDefaultAddressForUser({
            address1: addressValues.address1.trim(),
            address2: addressValues.address2?.trim(),
            city: addressValues.city.trim(),
            countryCode,
            postalCode: addressValues.postalCode?.trim(),
            province: addressValues.province?.trim(),
            userId: input.id,
          })
        }
      }
      return {
        ok: true,
      }
    },
  )
