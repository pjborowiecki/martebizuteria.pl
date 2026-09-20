import { createServerFn } from "@tanstack/react-start"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { deleteUserAddress } from "~/src/modules/address/address.accessors"
import { addressIdInputSchema } from "~/src/modules/address/address.zod"

export const deleteUserAddressFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => addressIdInputSchema.parse(data))
  .handler(async ({ data: { addressId } }) => {
    const session = await getRequestSession()
    const userId = session?.user.id
    if (userId === undefined) {
      throw new Error("Unauthorized")
    }

    const deleted = await deleteUserAddress(userId, addressId)
    if (!deleted) {
      throw new Error("Address not found")
    }

    return { ok: true as const }
  })
