import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized, isRecentSignIn } from "~/src/integrations/better-auth/auth.middleware"

import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { listAdminTeamRows } from "~/src/modules/user/user.team.server"
import { type User } from "~/src/modules/user/user.types"

export const listAdminTeam = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["list"] })])
  .handler(async ({ context }): Promise<User["adminTeam"]> => {
    const rows = await listAdminTeamRows()

    return {
      members: rows.map((row) => ({
        email: row.email,
        hasGoogle: row.hasGoogle,
        hasPassword: row.hasPassword,
        id: row.id,
        isCurrentUser: row.id === context.auth.user.id,
        lastSignInAt: row.lastSignInAt ?? undefined,
        name: row.name,
        twoFactorEnabled: row.twoFactorEnabled === true,
      })),
      recentSignIn: isRecentSignIn(context.auth.session),
    }
  })

export const listAdminTeamQuery = () =>
  queryOptions({
    queryFn: () => listAdminTeam(),
    queryKey: USER_QUERY_KEYS.ADMIN.TEAM,
  })
