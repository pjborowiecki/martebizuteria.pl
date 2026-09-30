import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { deleteUserAddress as addressDeleteUserAddress } from "~/src/modules/address/address.accessors"
import { ADDRESS_MUTATION_KEYS } from "~/src/modules/address/address.constants"
import { addressIdInputSchema } from "~/src/modules/address/address.zod"

export const deleteUserAddress = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof addressIdInputSchema>) => addressIdInputSchema.parse(input))
  .handler(async ({ context, data: { addressId } }) => {
    const deleted = await addressDeleteUserAddress(context.auth.user.id, addressId)
    if (!deleted) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return { ok: true as const }
  })

export const deleteUserAddressMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof deleteUserAddress>[0]["data"]) => deleteUserAddress({ data }),
  mutationKey: ADDRESS_MUTATION_KEYS.DELETE,
})
