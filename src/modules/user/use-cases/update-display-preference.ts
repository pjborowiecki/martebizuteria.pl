import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq, sql } from "drizzle-orm"
import type * as zod from "zod"

import { RATE_LIMITS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const updateDisplayPreference = createServerFn({ method: "POST" })
  .middleware([withRateLimit("update-display-preference", RATE_LIMITS.SENSITIVE), authorized()])
  .validator((input: zod.input<typeof userZodSchemas.displayPreferenceInput>) => userZodSchemas.displayPreferenceInput.parse(input))
  .handler(async ({ context, data: { preference, value } }): Promise<boolean> => {
    const saved = value === "" ? sql`NULL` : value
    await db
      .update(user)
      .set(preference === "formatLocale" ? { formatLocale: saved, updatedAt: new Date() } : { timezone: saved, updatedAt: new Date() })
      .where(eq(user.id, context.auth.user.id))

    return true
  })

export const updateDisplayPreferenceMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof updateDisplayPreference>[0]["data"]) => updateDisplayPreference({ data }),
  mutationKey: USER_MUTATION_KEYS.UPDATE_DISPLAY_PREFERENCE,
})
