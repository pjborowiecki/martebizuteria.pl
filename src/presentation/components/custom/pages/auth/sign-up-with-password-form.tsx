import { type JSX, type SyntheticEvent, useCallback } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { type SignUpFormValues, signUpWithPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AuthPasswordField, AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"
import { useSignUpWithPassword } from "~/src/presentation/components/custom/pages/auth/hooks/use-sign-up-with-password"

export const SignUpWithPasswordForm = (): JSX.Element => {
  const t = useTranslations()
  const signUpMutation = useSignUpWithPassword()
  const form = useForm<SignUpFormValues>({
    defaultValues: {
      confirmPassword: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
    },
    mode: "onTouched",
    resolver: zodResolver(signUpWithPasswordSchema),
  })

  const onSubmit = useCallback(
    (data: SignUpFormValues) => {
      signUpMutation.mutate(data)
    },
    [signUpMutation],
  )

  const handleFormSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      void form.handleSubmit(onSubmit)(event)
    },
    [form, onSubmit],
  )

  const isSubmitting = signUpMutation.isPending

  return (
    <form id="sign-up-form" onSubmit={handleFormSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <AuthTextField
          control={form.control}
          name="firstName"
          id="sign-up-first-name"
          label={t("components.custom.authForm.firstName")}
          autoComplete="given-name"
          disabled={isSubmitting}
          required
        />
        <AuthTextField
          control={form.control}
          name="lastName"
          id="sign-up-last-name"
          label={t("components.custom.authForm.lastName")}
          autoComplete="family-name"
          disabled={isSubmitting}
          required
        />
      </div>

      <AuthTextField
        control={form.control}
        name="email"
        id="sign-up-email"
        type="email"
        label={t("components.custom.authForm.email")}
        autoComplete="email"
        disabled={isSubmitting}
        required
      />

      <AuthPasswordField
        control={form.control}
        name="password"
        id="sign-up-password"
        label={t("components.custom.authForm.password")}
        autoComplete="new-password"
        disabled={isSubmitting}
        required
      />

      <AuthPasswordField
        control={form.control}
        name="confirmPassword"
        id="sign-up-confirm-password"
        label={t("components.custom.authForm.confirmPassword")}
        autoComplete="new-password"
        disabled={isSubmitting}
        required
      />

      <Button size="xl" type="submit" className="w-full gap-3.5 tracking-wide" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isSubmitting ? t("pages.auth.sign-up.submitting") : t("pages.auth.sign-up.submit")}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  )
}
