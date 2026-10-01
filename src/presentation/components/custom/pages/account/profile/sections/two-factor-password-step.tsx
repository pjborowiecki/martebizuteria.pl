import { type JSX, type SyntheticEvent, useCallback } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { type PasswordConfirmFormValues, passwordConfirmSchema } from "~/src/integrations/better-auth/auth.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/src/presentation/components/shadcn/dialog"

import { AuthPasswordField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

export const TwoFactorPasswordStep = ({ disabling, onCancel, onSubmit }: Readonly<TwoFactorPasswordStepProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile.twoFactorDialog")
  const form = useForm<PasswordConfirmFormValues>({
    defaultValues: { password: "" },
    mode: "onChange",
    resolver: zodResolver(passwordConfirmSchema),
  })

  const handleSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      void form.handleSubmit(async (values) => {
        await onSubmit(values.password)
      })(event)
    },
    [form, onSubmit],
  )

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{disabling ? t("disableTitle") : t("enableTitle")}</DialogTitle>
        <DialogDescription>{disabling ? t("disableDescription") : t("enableDescription")}</DialogDescription>
      </DialogHeader>

      <div className="py-4">
        <AuthPasswordField
          autoComplete="current-password"
          autoFocus
          control={form.control}
          id="two-factor-password"
          label={t("password")}
          name="password"
        />
      </div>

      <DialogFooter>
        <Button disabled={form.formState.isSubmitting} onClick={onCancel} type="button" variant="outline">
          {t("cancel")}
        </Button>
        <Button
          className="gap-1.5"
          disabled={!form.formState.isValid || form.formState.isSubmitting}
          type="submit"
          variant={disabling ? "destructive" : "default"}
        >
          {form.formState.isSubmitting && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
          {disabling ? t("confirmDisable") : t("continue")}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface TwoFactorPasswordStepProps {
  readonly disabling: boolean
  readonly onCancel: () => void
  readonly onSubmit: (password: string) => Promise<void>
}
