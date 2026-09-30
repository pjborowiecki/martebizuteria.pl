import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"

import { createUserAddress as addressCreateUserAddress } from "~/src/modules/address/address.accessors"
import { addressFieldsSchema } from "~/src/modules/address/address.zod"

export const createUserAddress = createServerFn({ method: "POST" })
  .middleware([withRateLimit("create-user-address", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: zod.input<typeof addressFieldsSchema>) => addressFieldsSchema.parse(input))
  .handler(({ context, data }) => addressCreateUserAddress({ ...data, userId: context.auth.user.id }))
