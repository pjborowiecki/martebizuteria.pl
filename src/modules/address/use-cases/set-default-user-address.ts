import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { setDefaultUserAddress as addressSetDefaultUserAddress } from "~/src/modules/address/address.accessors"
import { ADDRESS_MUTATION_KEYS } from "~/src/modules/address/address.constants"
import { addressIdInputSchema } from "~/src/modules/address/address.zod"

export const setDefaultUserAddress = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof addressIdInputSchema>) => addressIdInputSchema.parse(input))
  .handler(async ({ context, data: { addressId } }) => {
    const updated = await addressSetDefaultUserAddress(context.auth.user.id, addressId)
    if (!updated) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return { ok: true as const }
  })

export const setDefaultUserAddressMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof setDefaultUserAddress>[0]["data"]) => setDefaultUserAddress({ data }),
  mutationKey: ADDRESS_MUTATION_KEYS.SET_DEFAULT,
})
