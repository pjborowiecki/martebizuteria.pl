import { type JSX, type SyntheticEvent, useCallback, useState } from "react"

import { type ErrorContext } from "@better-fetch/fetch"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClientOnlyFn } from "@tanstack/react-start"
import { ArrowRight, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { type ForgotPasswordFormValues, forgotPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { useActionError } from "~/src/hooks/use-action-error"

import { buildLocalizedUrl } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

import { ROUTES } from "~/src/routes"

const requestPasswordReset = createClientOnlyFn((input: Parameters<typeof authClient.requestPasswordReset>[0]) =>
  authClient.requestPasswordReset(input),
)

export const ForgotPasswordForm = (): JSX.Element => {
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const t = useTranslations()
  const actionError = useActionError()
  const locale = useLocale()
  const form = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = useCallback(
    async (data: ForgotPasswordFormValues) => {
      await requestPasswordReset({
        email: data.email,
        fetchOptions: {
          onError: (ctx: ErrorContext) => {
            toast.error(t("pages.auth.toast.errorTitle"), {
              description: actionError(ctx.error),
            })
          },
          onSuccess: () => {
            setHasSubmitted(true)
            toast.success(t("pages.auth.toast.forgotPasswordTitle"), {
              description: t("pages.auth.toast.forgotPasswordDescription"),
            })
          },
        },
        redirectTo: buildLocalizedUrl("", ROUTES.AUTH_RESET_PASSWORD, locale),
      })
    },
    [locale, t],
  )

  const handleFormSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      void form.handleSubmit(onSubmit)(event)
    },
    [form, onSubmit],
  )

  const requestAnotherLink = useCallback(() => {
    setHasSubmitted(false)
  }, [])

  const { isSubmitting } = form.formState
  if (hasSubmitted) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t("pages.auth.forgot-password.checkEmail")}</p>
        <Button className="w-full tracking-wide" onClick={requestAnotherLink} size="lg" type="button" variant="outline">
          {t("pages.auth.forgot-password.requestAnother")}
        </Button>
      </div>
    )
  }

  return (
    <form id="forgot-password-form" onSubmit={handleFormSubmit} className="space-y-5">
      <AuthTextField
        control={form.control}
        name="email"
        id="forgot-password-email"
        type="email"
        label={t("components.custom.authForm.email")}
        autoComplete="email"
        disabled={isSubmitting}
        required
      />

      <Button size="xl" type="submit" className="w-full gap-2.5 tracking-wide" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isSubmitting ? t("pages.auth.forgot-password.submitting") : t("pages.auth.forgot-password.submit")}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  )
}
