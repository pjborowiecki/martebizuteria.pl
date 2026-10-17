import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { authorized, recentSignIn } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleAdminCustomersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { recordTeamAccessAudit, resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.events.server"
import { getUserById } from "~/src/modules/user/user.accessors"
import { TEAM_ERROR, USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import { revokeAdminRole } from "~/src/modules/user/user.team.server"
import { type User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { resolveRequestIp } from "~/src/lib/request"

const refusedRevoke = (target: User["select"] | undefined): AppError => {
  if (target === undefined) {
    return new AppError(ERROR_CODES.NOT_FOUND, TEAM_ERROR.NOT_FOUND)
  }

  return new AppError(ERROR_CODES.CONFLICT, target.role === ROLES.ADMIN ? TEAM_ERROR.LAST_ADMIN : TEAM_ERROR.NOT_ADMIN)
}

export const revokeAdminAccess = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["set-role"] }), recentSignIn])
  .validator((input: zod.input<typeof userZodSchemas.teamAccessInput>) => userZodSchemas.teamAccessInput.parse(input))
  .handler(async ({ context, data: { userId } }) => {
    if (userId === context.auth.user.id) {
      throw new AppError(ERROR_CODES.FORBIDDEN, TEAM_ERROR.OWN_ACCESS)
    }

    const revoked = await revokeAdminRole({ actorId: context.auth.user.id, userId })
    if (revoked === undefined) {
      throw refusedRevoke(await getUserById(userId))
    }

    scheduleAdminCustomersInvalidation()
    recordTeamAccessAudit(AUDIT_LOG_ACTION.TEAM_ADMIN_REVOKED, resolveAuthAuditActor(revoked), {
      actor: resolveAuthAuditActor(context.auth.user),
      ip: resolveRequestIp(context.requestHeaders),
    })

    return { userId }
  })

export const revokeAdminAccessMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof revokeAdminAccess>[0]["data"]) => revokeAdminAccess({ data }),
  mutationKey: USER_MUTATION_KEYS.REVOKE_ADMIN_ACCESS,
})
