import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"
import { user } from "~/src/modules/user/user.schema"

export const updateCustomerPhoneFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => customerAccountZodSchemas.phoneInput.parse(data))
  .handler(async ({ data: { phone } }): Promise<boolean> => {
    const authSession = await getRequestSession()
    if (authSession?.user === undefined) {
      return false
    }

    await db
      .update(user)
      .set({ phone: phone === "" ? sql`NULL` : phone })
      .where(eq(user.id, authSession.user.id))
    return true
  })
