import { useCallback } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { grantAdminAccessMutation } from "~/src/modules/user/use-cases/grant-admin-access"
import { revokeAdminAccessMutation } from "~/src/modules/user/use-cases/revoke-admin-access"
import { TEAM_ERROR, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { useActionError } from "~/src/hooks/use-action-error"

const TEAM_ERRORS: ReadonlySet<string> = new Set(Object.values(TEAM_ERROR))

export const useTeamAccess = () => {
  const t = useTranslations("pages.admin.settings.team")
  const queryClient = useQueryClient()
  const actionError = useActionError()

  const refresh = useCallback(
    () =>
      Promise.all([
        syncQueryInvalidation(queryClient, USER_QUERY_KEYS.ADMIN.TEAM),
        syncQueryInvalidation(queryClient, USER_QUERY_KEYS.ADMIN.CUSTOMERS),
      ]),
    [queryClient],
  )

  const reportError = useCallback(
    async (error: Error) => {
      toast.error(TEAM_ERRORS.has(error.message) ? t(`errors.${error.message}`) : actionError(error))
      await refresh()
    },
    [actionError, refresh, t],
  )

  const grant = useMutation({ ...grantAdminAccessMutation, onError: reportError, onSuccess: refresh })
  const revoke = useMutation({ ...revokeAdminAccessMutation, onError: reportError, onSuccess: refresh })

  return { grant, revoke }
}
