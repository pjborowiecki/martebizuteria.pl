import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { updateUserAddress as addressUpdateUserAddress } from "~/src/modules/address/address.accessors"
import { addressFieldsSchema, addressIdInputSchema } from "~/src/modules/address/address.zod"

const updateUserAddressSchema = addressFieldsSchema.extend(addressIdInputSchema.shape)

export const updateUserAddress = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof updateUserAddressSchema>) => updateUserAddressSchema.parse(input))
  .handler(async ({ context, data: { addressId, ...fields } }) => {
    const updated = await addressUpdateUserAddress({ ...fields, id: addressId, userId: context.auth.user.id })
    if (updated === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return updated
  })
