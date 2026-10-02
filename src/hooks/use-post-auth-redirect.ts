import { useCallback } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

export const usePostAuthRedirect = (): (() => Promise<void>) => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useCallback(async () => {
    queryClient.removeQueries({ exact: true, queryKey: getCurrentSessionQuery.queryKey })
    router.clearCache()
    await router.invalidate()
  }, [queryClient, router])
}
