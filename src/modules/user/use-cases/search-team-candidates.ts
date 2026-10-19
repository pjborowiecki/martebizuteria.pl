import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { searchTeamCandidateRows } from "~/src/modules/user/user.accessors"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const searchTeamCandidates = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["list"] })])
  .validator((input: zod.input<typeof userZodSchemas.teamCandidateSearchInput>) => userZodSchemas.teamCandidateSearchInput.parse(input))
  .handler(async ({ data: { search } }): Promise<readonly User["teamCandidate"][]> => {
    const rows = await searchTeamCandidateRows(search)

    return rows.map((row) => ({
      banned: row.banned === true,
      email: row.email,
      emailVerified: row.emailVerified,
      id: row.id,
      name: row.name,
      twoFactorEnabled: row.twoFactorEnabled === true,
    }))
  })

export const searchTeamCandidatesQuery = (search: string) =>
  queryOptions({
    queryFn: () => searchTeamCandidates({ data: { search } }),
    queryKey: [...USER_QUERY_KEYS.ADMIN.TEAM_CANDIDATES, search],
  })
