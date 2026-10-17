import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod/v4"

import { RATE_LIMITS, authorized, recentSignIn, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { strictPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import { recordAuthPasswordChangedAudit, resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.events.server"

import { resolveRequestIp } from "~/src/lib/request"

const setAccountPasswordInputSchema = z.object({ newPassword: strictPasswordSchema })

export const setAccountPassword = createServerFn({ method: "POST" })
  .middleware([withRateLimit("set-account-password", RATE_LIMITS.SENSITIVE), authorized(), recentSignIn])
  .validator((input: z.input<typeof setAccountPasswordInputSchema>) => setAccountPasswordInputSchema.parse(input))
  .handler(async ({ context, data: { newPassword } }): Promise<{ ok: true }> => {
    await auth.api.setPassword({ body: { newPassword }, headers: context.requestHeaders })
    recordAuthPasswordChangedAudit(resolveAuthAuditActor(context.auth.user), { ip: resolveRequestIp(context.requestHeaders) })

    return { ok: true }
  })

export const setAccountPasswordMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof setAccountPassword>[0]["data"]) => setAccountPassword({ data }),
  mutationKey: ACCOUNT_MUTATION_KEYS.SET_PASSWORD,
})
