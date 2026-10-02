import { type JSX, type SyntheticEvent, useCallback, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { createClientOnlyFn } from "@tanstack/react-start"
import { ArrowRight, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { signIn } from "~/src/integrations/better-auth/auth.client"
import { type SignInFormValues, signInWithPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { useActionError } from "~/src/hooks/use-action-error"
import { usePostAuthRedirect } from "~/src/hooks/use-post-auth-redirect"

import { Button } from "~/src/presentation/components/shadcn/button"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { AuthPasswordField, AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"
import { TwoFactorChallengeForm } from "~/src/presentation/components/custom/pages/auth/two-factor-challenge-form"

import { ROUTES } from "~/src/routes"

const signInEmail = createClientOnlyFn((input: Parameters<typeof signIn.email>[0]) => signIn.email(input))

const isTwoFactorRequired = (data: unknown): boolean =>
  typeof data === "object" && data !== null && "twoFactorRedirect" in data && data.twoFactorRedirect === true

export const SignInWithPasswordForm = (): JSX.Element => {
  const redirectAfterAuth = usePostAuthRedirect()
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const t = useTranslations()
  const actionError = useActionError()
  const form = useForm<SignInFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
    resolver: zodResolver(signInWithPasswordSchema),
  })

  const onSubmit = useCallback(
    async (data: SignInFormValues) => {
      await signInEmail({
        email: data.email,
        fetchOptions: {
          onError: (ctx) => {
            toast.error(t("pages.auth.toast.errorTitle"), {
              description: actionError(ctx.error),
            })
          },
          onSuccess: async (ctx) => {
            if (isTwoFactorRequired(ctx.data)) {
              setTwoFactorRequired(true)

              return
            }
            toast.success(t("pages.auth.toast.signInTitle"), {
              description: t("pages.auth.toast.signInDescription"),
            })

            await redirectAfterAuth()
          },
        },
        password: data.password,
      })
    },
    [actionError, redirectAfterAuth, t],
  )

  const handleFormSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      void form.handleSubmit(onSubmit)(event)
    },
    [form, onSubmit],
  )

  const leaveTwoFactor = useCallback(() => {
    setTwoFactorRequired(false)
    form.reset()
  }, [form])

  const { isSubmitting } = form.formState

  if (twoFactorRequired) {
    return <TwoFactorChallengeForm onCancel={leaveTwoFactor} />
  }

  return (
    <form id="sign-in-form" onSubmit={handleFormSubmit} className="space-y-5">
      <AuthTextField
        control={form.control}
        name="email"
        id="sign-in-email"
        type="email"
        label={t("components.custom.authForm.email")}
        autoComplete="email"
        disabled={isSubmitting}
        required
      />

      <div className="space-y-2">
        <AuthPasswordField
          control={form.control}
          name="password"
          id="sign-in-password"
          label={t("components.custom.authForm.password")}
          autoComplete="current-password"
          disabled={isSubmitting}
          required
        />
        <div className="flex justify-end">
          <LocalizedLink
            to={ROUTES.AUTH_FORGOT_PASSWORD}
            className="text-xs text-muted-foreground/70 underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {t("pages.auth.sign-in.forgotPassword")}
          </LocalizedLink>
        </div>
      </div>

      <Button size="xl" type="submit" className="w-full gap-3.5 tracking-wide" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isSubmitting ? t("pages.auth.sign-in.submitting") : t("pages.auth.sign-in.submit")}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  )
}
