import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"
import type * as zod from "zod"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CUSTOMER_ACCOUNT_MUTATION_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"
import { user } from "~/src/modules/user/user.schema"

export const updateCustomerPhone = createServerFn({ method: "POST" })
  .middleware([withRateLimit("update-customer-phone", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: zod.input<typeof customerAccountZodSchemas.phoneInput>) => customerAccountZodSchemas.phoneInput.parse(input))
  .handler(async ({ context, data: { phone } }): Promise<boolean> => {
    await db
      .update(user)
      .set({ phone: phone === "" ? sql`NULL` : phone })
      .where(eq(user.id, context.auth.user.id))

    return true
  })

export const updateCustomerPhoneMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof updateCustomerPhone>[0]["data"]) => updateCustomerPhone({ data }),
  mutationKey: CUSTOMER_ACCOUNT_MUTATION_KEYS.UPDATE_PHONE,
})
