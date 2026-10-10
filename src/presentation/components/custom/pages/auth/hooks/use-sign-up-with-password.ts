import { type UseMutationResult, useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { signUp } from "~/src/integrations/better-auth/auth.client"
import { type SignUpFormValues } from "~/src/integrations/better-auth/auth.zod"
import { TURNSTILE_TOKEN_HEADER } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"

import { useActionError } from "~/src/hooks/use-action-error"

import { buildLocalizedUrl } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

const signUpEmail = createClientOnlyFn((input: Parameters<typeof signUp.email>[0]) => signUp.email(input))

export const useSignUpWithPassword = (requestTurnstileToken: () => Promise<string>): UseMutationResult<void, unknown, SignUpFormValues> => {
  const navigate = useNavigate()
  const t = useTranslations()
  const actionError = useActionError()
  const locale = useLocale()

  return useMutation({
    mutationFn: async (data: SignUpFormValues) => {
      const { error } = await signUpEmail({
        callbackURL: buildLocalizedUrl("", `${ROUTES.ACCOUNT_OVERVIEW}?verified=true`, locale),
        email: data.email,
        fetchOptions: { headers: { [TURNSTILE_TOKEN_HEADER]: await requestTurnstileToken() } },
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
      const authError = error instanceof Error ? (error.cause ?? error) : error
      toast.error(t("pages.auth.toast.errorTitle"), {
        description: actionError(authError),
      })
    },
    onSuccess: () => {
      toast.success(t("pages.auth.toast.signUpTitle"), {
        description: t("pages.auth.toast.signUpDescription"),
      })
      void navigate({
        to: ROUTES.AUTH_SIGN_IN,
      })
    },
  })
}
