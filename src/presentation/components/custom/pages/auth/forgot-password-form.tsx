import { type JSX, type SyntheticEvent, useCallback, useState } from "react"

import { type ErrorContext } from "@better-fetch/fetch"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl"

import { authClient } from "~/src/integrations/better-auth/auth-client"
import { getAuthErrorMessage } from "~/src/integrations/better-auth/auth.errors"
import { type ForgotPasswordFormValues, forgotPasswordSchema } from "~/src/integrations/better-auth/auth.schemas"

import { buildLocalizedUrl } from "~/src/lib/sitemap"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

import { ROUTES } from "~/src/routes"
export const ForgotPasswordForm = (): JSX.Element => {
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const t = useTranslations()
  const locale = useLocale()
  const formSchema = forgotPasswordSchema(t)
  const form = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
    resolver: zodResolver(formSchema),
  })
  const onSubmit = useCallback(
    async (data: ForgotPasswordFormValues) => {
      await authClient.requestPasswordReset({
        email: data.email,
        fetchOptions: {
          onError: (ctx: ErrorContext) => {
            toast.error(t("pages.auth.toast.errorTitle"), {
              description: getAuthErrorMessage(t, ctx.error),
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
  const { isSubmitting } = form.formState
  if (hasSubmitted) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t("pages.auth.forgot-password.checkEmail")}</p>
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
