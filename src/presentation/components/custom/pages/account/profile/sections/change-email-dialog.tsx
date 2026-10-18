import { type JSX, type SyntheticEvent, useCallback, useState } from "react"

import { type ErrorContext } from "@better-fetch/fetch"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClientOnlyFn } from "@tanstack/react-start"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { EMAIL_CHANGE_RECENT_SIGN_IN_MINUTES } from "~/src/integrations/better-auth/auth.constants"
import { AUTH_ERRORS, authErrorKey } from "~/src/integrations/better-auth/auth.errors"
import { type ChangeEmailFormValues, changeEmailSchema } from "~/src/integrations/better-auth/auth.zod"

import { useActionError } from "~/src/hooks/use-action-error"

import { type DialogVariant } from "~/src/presentation/components/shadcn/_styles/dialog.styles"
import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"

import { AccountDialogEyebrow } from "~/src/presentation/components/custom/pages/account/account-dialog-eyebrow"
import { AuthPasswordField, AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"
import { SignInAgainButton } from "~/src/presentation/components/custom/pages/auth/sign-in-again-button"

const changeEmailRequest = createClientOnlyFn((input: Parameters<typeof authClient.changeEmail>[0]) => authClient.changeEmail(input))

const RecentSignInNote = ({ signInAgain }: Readonly<{ signInAgain: boolean }>): JSX.Element => {
  const t = useTranslations("pages.account.profile.emailDialog")
  const minutes = EMAIL_CHANGE_RECENT_SIGN_IN_MINUTES

  if (!signInAgain) {
    return <p className="text-[12px] leading-relaxed text-muted-foreground">{t("recentSignInNote", { minutes })}</p>
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5" role="status">
      <p className="text-[12px] leading-relaxed text-foreground">{t("recentSignInNeeded", { minutes })}</p>
      <SignInAgainButton label={t("signInAgain")} />
    </div>
  )
}

export const ChangeEmailDialog = ({
  currentEmail,
  hasPassword,
  onOpenChange,
  open,
  variant = "editorial",
}: Readonly<ChangeEmailDialogProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile.emailDialog")
  const tProfile = useTranslations("pages.account.profile")
  const actionError = useActionError()
  const [signInAgain, setSignInAgain] = useState(false)
  const form = useForm<ChangeEmailFormValues>({
    defaultValues: { email: "", password: "" },
    mode: "onChange",
    resolver: zodResolver(changeEmailSchema(hasPassword)),
  })

  const onSubmit = useCallback(
    async (values: ChangeEmailFormValues) => {
      await changeEmailRequest({
        callbackURL: globalThis.location.pathname,
        fetchOptions: {
          body: { password: values.password },
          onError: ({ error }: ErrorContext) => {
            const refusal = authErrorKey(error)
            if (refusal === AUTH_ERRORS.INVALID_PASSWORD) {
              form.setError("password", { message: "passwordIncorrect" })
            } else if (refusal === AUTH_ERRORS.SESSION_NOT_FRESH) {
              setSignInAgain(true)
            } else {
              toast.error(t("errorTitle"), { description: actionError(error) })
            }
          },
          onSuccess: () => {
            toast.success(t("successTitle"), { description: t("successDescription", { email: currentEmail }) })
            form.reset()
            onOpenChange(false)
          },
        },
        newEmail: values.email,
      })
    },
    [actionError, currentEmail, form, onOpenChange, t],
  )

  const handleFormSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      void form.handleSubmit(onSubmit)(event)
    },
    [form, onSubmit],
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (form.formState.isSubmitting) {
        return
      }

      if (!nextOpen) {
        form.reset()
        setSignInAgain(false)
      }
      onOpenChange(nextOpen)
    },
    [form, onOpenChange],
  )

  const handleCancel = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md" variant={variant}>
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <AccountDialogEyebrow>{tProfile("personalInfo")}</AccountDialogEyebrow>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description", { email: currentEmail })}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <AuthTextField autoComplete="email" control={form.control} id="new-email" label={t("newEmail")} name="email" type="email" />
            {hasPassword ? (
              <AuthPasswordField
                autoComplete="current-password"
                control={form.control}
                id="change-email-password"
                label={t("password")}
                name="password"
              />
            ) : (
              <RecentSignInNote signInAgain={signInAgain} />
            )}
          </div>

          <DialogFooter>
            <Button disabled={form.formState.isSubmitting} onClick={handleCancel} type="button" variant="outline">
              {t("cancel")}
            </Button>
            <Button className="gap-1.5" disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ChangeEmailDialogProps {
  readonly currentEmail: string
  readonly hasPassword: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly variant?: DialogVariant
}
