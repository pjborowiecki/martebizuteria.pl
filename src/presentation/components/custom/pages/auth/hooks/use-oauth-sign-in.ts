import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientOnlyFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { useActionError } from "~/src/hooks/use-action-error"

import { buildLocalizedUrl } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

const signInSocial = createClientOnlyFn((input: Parameters<typeof authClient.signIn.social>[0]) => authClient.signIn.social(input))

type OAuthProvider = "google" | "github"

export const useOAuthSignIn = (): UseMutationResult<void, unknown, OAuthProvider> => {
  const queryClient = useQueryClient()
  const t = useTranslations()
  const actionError = useActionError()
  const locale = useLocale()

  return useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const { error } = await signInSocial({
        callbackURL: buildLocalizedUrl("", ROUTES.ACCOUNT_OVERVIEW, locale),
        provider,
      })

      if (error !== null) {
        throw new Error("OAUTH_SIGN_IN_FAILED", {
          cause: error,
        })
      }
    },
    onError: (error) => {
      const authError = error instanceof Error ? error.cause : error
      toast.error(t("pages.auth.toast.errorTitle"), {
        description: actionError(authError),
      })
    },
    onSettled: () => {
      void syncQueryInvalidation(queryClient, USER_QUERY_KEYS.ADMIN.CUSTOMERS)
    },
    onSuccess: () => {
      toast.success(t("pages.auth.toast.signInTitle"), {
        description: t("pages.auth.toast.signInDescription"),
      })
    },
  })
}
