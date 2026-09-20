import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl"

import { signUp } from "~/src/integrations/better-auth/auth-client"
import { getAuthErrorMessage } from "~/src/integrations/better-auth/auth.errors"
import { type SignUpFormValues } from "~/src/integrations/better-auth/auth.schemas"

import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { syncQueryInvalidation } from "~/src/lib/query-client-sync"
import { buildLocalizedUrl } from "~/src/lib/sitemap"

import { ROUTES } from "~/src/routes"

/** Email/password sign-up; on settle, refreshes the admin customer registry query (prefix covers stats too). */
export const useSignUpWithPassword = (): UseMutationResult<void, unknown, SignUpFormValues> => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const t = useTranslations()
  const locale = useLocale()
  return useMutation({
    mutationFn: async (data: SignUpFormValues) => {
      const { error } = await signUp.email({
        callbackURL: buildLocalizedUrl("", `${ROUTES.ACCOUNT_OVERVIEW}?verified=true`, locale),
        email: data.email,
        name: `${data.firstName} ${data.lastName}`.trim(),
        password: data.password,
      })
      if (error !== null) {
        throw new Error("SIGN_UP_FAILED", {
          cause: error,
        })
      }
    },
    onError: (error) => {
      const authError = error instanceof Error ? error.cause : error
      toast.error(t("pages.auth.toast.errorTitle"), {
        description: getAuthErrorMessage(t, authError),
      })
    },
    onSettled: () => {
      void syncQueryInvalidation(queryClient, USER_QUERY_KEYS.ADMIN.CUSTOMERS)
    },
    onSuccess: () => {
      toast.success(t("pages.auth.toast.signUpTitle"), {
        description: t("pages.auth.toast.signUpDescription"),
      })
      void navigate({
        to: `/{-$locale}${ROUTES.AUTH_SIGN_IN}`,
      })
    },
  })
}
