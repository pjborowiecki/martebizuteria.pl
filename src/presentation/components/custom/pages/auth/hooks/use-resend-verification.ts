import { type UseMutationResult, useMutation } from "@tanstack/react-query"
import { createClientOnlyFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { TURNSTILE_TOKEN_HEADER } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"

import { useActionError } from "~/src/hooks/use-action-error"

import { buildLocalizedUrl } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

const sendVerificationEmail = createClientOnlyFn((input: Parameters<typeof authClient.sendVerificationEmail>[0]) =>
  authClient.sendVerificationEmail(input),
)

export const useResendVerification = (requestTurnstileToken: () => Promise<string>): UseMutationResult<void, Error, string> => {
  const t = useTranslations("pages.auth.toast")
  const actionError = useActionError()
  const locale = useLocale()

  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await sendVerificationEmail({
        callbackURL: buildLocalizedUrl("", `${ROUTES.ACCOUNT_OVERVIEW}?verified=true`, locale),
        email,
        fetchOptions: { headers: { [TURNSTILE_TOKEN_HEADER]: await requestTurnstileToken() } },
      })

      if (error !== null) {
        throw new Error("RESEND_VERIFICATION_FAILED", { cause: error })
      }
    },
    onError: (error) => {
      toast.error(t("errorTitle"), { description: actionError(error.cause ?? error) })
    },
    onSuccess: (_result, email) => {
      toast.success(t("verificationResentTitle"), { description: t("verificationResentDescription", { email }) })
    },
  })
}
