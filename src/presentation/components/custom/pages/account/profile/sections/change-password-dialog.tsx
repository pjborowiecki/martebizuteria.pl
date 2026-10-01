import { type JSX, type SyntheticEvent, useCallback } from "react"

import { type ErrorContext } from "@better-fetch/fetch"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClientOnlyFn } from "@tanstack/react-start"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { type ChangePasswordFormValues, changePasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { useActionError } from "~/src/hooks/use-action-error"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"
import { Label } from "~/src/presentation/components/shadcn/label"

import { AuthPasswordField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

const changePasswordRequest = createClientOnlyFn((input: Parameters<typeof authClient.changePassword>[0]) =>
  authClient.changePassword(input),
)

export const ChangePasswordDialog = ({ onOpenChange, open }: Readonly<ChangePasswordDialogProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile.passwordDialog")
  const actionError = useActionError()
  const form = useForm<ChangePasswordFormValues>({
    defaultValues: { confirmPassword: "", currentPassword: "", password: "", revokeOtherSessions: true },
    mode: "onTouched",
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = useCallback(
    async (values: ChangePasswordFormValues) => {
      await changePasswordRequest({
        currentPassword: values.currentPassword,
        fetchOptions: {
          onError: (ctx: ErrorContext) => {
            toast.error(t("errorTitle"), { description: actionError(ctx.error) })
          },
          onSuccess: () => {
            toast.success(t("successTitle"), { description: t("successDescription") })
            form.reset()
            onOpenChange(false)
          },
        },
        newPassword: values.password,
        revokeOtherSessions: values.revokeOtherSessions,
      })
    },
    [actionError, form, onOpenChange, t],
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
      }
      onOpenChange(nextOpen)
    },
    [form, onOpenChange],
  )

  const handleCancel = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <AuthPasswordField
              autoComplete="current-password"
              control={form.control}
              id="current-password"
              label={t("currentPassword")}
              name="currentPassword"
            />
            <AuthPasswordField
              autoComplete="new-password"
              control={form.control}
              id="new-password"
              label={t("newPassword")}
              name="password"
            />
            <AuthPasswordField
              autoComplete="new-password"
              control={form.control}
              id="confirm-new-password"
              label={t("confirmPassword")}
              name="confirmPassword"
            />
            <div className="flex items-center gap-3">
              <Checkbox defaultChecked id="revoke-other-sessions" {...form.register("revokeOtherSessions")} />
              <Label htmlFor="revoke-other-sessions">{t("revokeOtherSessions")}</Label>
            </div>
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

interface ChangePasswordDialogProps {
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
