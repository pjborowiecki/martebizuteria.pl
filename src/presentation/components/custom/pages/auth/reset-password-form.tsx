import { type JSX, type SyntheticEvent, useCallback } from "react"

import { type ErrorContext } from "@better-fetch/fetch"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "@tanstack/react-router"
import { ArrowRight, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { resetPassword } from "~/src/integrations/better-auth/auth-client"
import { getAuthErrorMessage } from "~/src/integrations/better-auth/auth.errors"
import { type ResetPasswordFormValues, resetPasswordSchema } from "~/src/integrations/better-auth/auth.schemas"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AuthPasswordField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

import { ROUTES } from "~/src/routes"
export const ResetPasswordForm = ({ token }: ResetPasswordFormProps): JSX.Element => {
  const navigate = useNavigate()
  const t = useTranslations()
  const formSchema = resetPasswordSchema(t)
  const form = useForm<ResetPasswordFormValues>({
    defaultValues: {
      confirmPassword: "",
      password: "",
    },
    mode: "onTouched",
    resolver: zodResolver(formSchema),
  })
  const onSubmit = useCallback(
    async (data: ResetPasswordFormValues) => {
      await resetPassword({
        fetchOptions: {
          onError: (ctx: ErrorContext) => {
            toast.error(t("pages.auth.toast.errorTitle"), {
              description: getAuthErrorMessage(t, ctx.error),
            })
          },
          onSuccess: () => {
            toast.success(t("pages.auth.toast.resetPasswordTitle"), {
              description: t("pages.auth.toast.resetPasswordDescription"),
            })
            void navigate({
              to: `/{-$locale}${ROUTES.AUTH_SIGN_IN}`,
            })
          },
        },
        newPassword: data.password,
        token,
      })
    },
    [navigate, t, token],
  )
  const handleFormSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      void form.handleSubmit(onSubmit)(event)
    },
    [form, onSubmit],
  )
  const { isSubmitting } = form.formState
  return (
    <form id="reset-password-form" onSubmit={handleFormSubmit} className="space-y-5">
      <AuthPasswordField
        control={form.control}
        name="password"
        id="reset-password"
        label={t("components.custom.authForm.password")}
        autoComplete="new-password"
        disabled={isSubmitting}
        required
      />

      <AuthPasswordField
        control={form.control}
        name="confirmPassword"
        id="reset-confirm-password"
        label={t("components.custom.authForm.confirmPassword")}
        autoComplete="new-password"
        disabled={isSubmitting}
        required
      />

      <Button size="xl" type="submit" className="w-full gap-2.5 tracking-wide" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isSubmitting ? t("pages.auth.reset-password.submitting") : t("pages.auth.reset-password.submit")}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  )
}
interface ResetPasswordFormProps {
  readonly token: string
}
