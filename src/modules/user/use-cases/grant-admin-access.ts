import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { authorized, recentSignIn } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleAdminCustomersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.utils"
import { recordTeamAccessAudit } from "~/src/modules/audit-log/use-cases/record-settings-audit.server"
import { getUserById, grantAdminRole } from "~/src/modules/user/user.accessors"
import { TEAM_ERROR, USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { resolveRequestIp } from "~/src/lib/request"

const refusedGrant = (target: User["select"] | undefined): AppError => {
  if (target === undefined) {
    return new AppError(ERROR_CODES.NOT_FOUND, TEAM_ERROR.NOT_FOUND)
  }

  if (target.role === ROLES.ADMIN) {
    return new AppError(ERROR_CODES.CONFLICT, TEAM_ERROR.ALREADY_ADMIN)
  }

  return new AppError(ERROR_CODES.CONFLICT, target.emailVerified ? TEAM_ERROR.ACCOUNT_BANNED : TEAM_ERROR.EMAIL_NOT_VERIFIED)
}

export const grantAdminAccess = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["set-role"] }), recentSignIn])
  .validator((input: zod.input<typeof userZodSchemas.teamAccessInput>) => userZodSchemas.teamAccessInput.parse(input))
  .handler(async ({ context, data: { userId } }) => {
    if (userId === context.auth.user.id) {
      throw new AppError(ERROR_CODES.FORBIDDEN, TEAM_ERROR.OWN_ACCESS)
    }

    const granted = await grantAdminRole(userId)
    if (granted === undefined) {
      throw refusedGrant(await getUserById(userId))
    }

    scheduleAdminCustomersInvalidation()
    recordTeamAccessAudit(AUDIT_LOG_ACTION.TEAM_ADMIN_GRANTED, resolveAuthAuditActor(granted), {
      actor: resolveAuthAuditActor(context.auth.user),
      ip: resolveRequestIp(context.requestHeaders),
    })

    return { userId }
  })

export const grantAdminAccessMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof grantAdminAccess>[0]["data"]) => grantAdminAccess({ data }),
  mutationKey: USER_MUTATION_KEYS.GRANT_ADMIN_ACCESS,
})
