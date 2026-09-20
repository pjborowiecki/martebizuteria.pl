import { createServerFn } from "@tanstack/react-start"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { updateUserAddress } from "~/src/modules/address/address.accessors"
import { addressFieldsSchema, addressIdInputSchema } from "~/src/modules/address/address.zod"

export const updateUserAddressFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => addressFieldsSchema.extend(addressIdInputSchema.shape).parse(data))
  .handler(async ({ data: { addressId, ...fields } }) => {
    const session = await getRequestSession()
    const userId = session?.user.id
    if (userId === undefined) {
      throw new Error("Unauthorized")
    }

    const updated = await updateUserAddress({ ...fields, id: addressId, userId })
    if (updated === undefined) {
      throw new Error("Address not found")
    }

    return updated
  })
