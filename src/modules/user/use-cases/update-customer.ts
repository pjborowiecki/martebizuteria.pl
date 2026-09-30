import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getDefaultAddressForUser, upsertDefaultAddressForUser } from "~/src/modules/address/address.accessors"
import { getUserById } from "~/src/modules/user/user.accessors"
import { USER_ERROR_CODES, USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"
import { type User } from "~/src/modules/user/user.types"
import { serializeAdminUserMetadata } from "~/src/modules/user/user.utils"
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

export const updateCustomer = createServerFn({
  method: "POST",
})
  .middleware([authorized({ user: ["update"] })])
  .validator((input: zod.input<typeof userZodSchemas.updateAdminCustomerInput>) => userZodSchemas.updateAdminCustomerInput.parse(input))
  .handler(
    async ({
      data: input,
    }): Promise<{
      ok: true
    }> => {
      const targetUser = await getUserById(input.id)
      if (targetUser === undefined) {
        throw new AppError(ERROR_CODES.NOT_FOUND, USER_ERROR_CODES.NOT_FOUND)
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

export const updateCustomerMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof updateCustomer>[0]["data"]) => updateCustomer({ data }),
  mutationKey: USER_MUTATION_KEYS.UPDATE_CUSTOMER,
})
