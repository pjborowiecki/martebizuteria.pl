import { createServerFn } from "@tanstack/react-start"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { setDefaultUserAddress } from "~/src/modules/address/address.accessors"
import { addressIdInputSchema } from "~/src/modules/address/address.zod"

export const setDefaultUserAddressFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => addressIdInputSchema.parse(data))
  .handler(async ({ data: { addressId } }) => {
    const session = await getRequestSession()
    const userId = session?.user.id
    if (userId === undefined) {
      throw new Error("Unauthorized")
    }

    const updated = await setDefaultUserAddress(userId, addressId)
    if (!updated) {
      throw new Error("Address not found")
    }

    return { ok: true as const }
  })
