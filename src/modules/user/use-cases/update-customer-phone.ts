import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"
import type * as zod from "zod"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const updateCustomerPhone = createServerFn({ method: "POST" })
  .middleware([withRateLimit("update-customer-phone", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: zod.input<typeof userZodSchemas.customerPhoneInput>) => userZodSchemas.customerPhoneInput.parse(input))
  .handler(async ({ context, data: { phone } }): Promise<boolean> => {
    await db
      .update(user)
      .set({ phone: phone === "" ? sql`NULL` : phone })
      .where(eq(user.id, context.auth.user.id))

    return true
  })

export const updateCustomerPhoneMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof updateCustomerPhone>[0]["data"]) => updateCustomerPhone({ data }),
  mutationKey: USER_MUTATION_KEYS.UPDATE_CUSTOMER_PHONE,
})
