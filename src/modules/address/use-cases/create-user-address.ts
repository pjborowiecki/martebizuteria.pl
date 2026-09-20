import { createServerFn } from "@tanstack/react-start"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { createUserAddress } from "~/src/modules/address/address.accessors"
import { addressFieldsSchema } from "~/src/modules/address/address.zod"

export const createUserAddressFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => addressFieldsSchema.parse(data))
  .handler(async (ctx) => {
    const session = await getRequestSession()
    const userId = session?.user.id
    if (userId === undefined) {
      throw new Error("Unauthorized")
    }

    return createUserAddress({ ...ctx.data, userId })
  })
