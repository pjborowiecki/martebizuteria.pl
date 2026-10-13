import { type JSX, type SyntheticEvent, useCallback } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type ResetPasswordFormValues, resetPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { setAccountPasswordMutation } from "~/src/modules/account/use-cases/set-account-password"
import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"

import { useActionError } from "~/src/hooks/use-action-error"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"

import { AuthPasswordField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

export const SetPasswordDialog = ({ onOpenChange, open }: Readonly<SetPasswordDialogProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile.setPasswordDialog")
  const actionError = useActionError()
  const queryClient = useQueryClient()
  const setPassword = useMutation(setAccountPasswordMutation)
  const form = useForm<ResetPasswordFormValues>({
    defaultValues: { confirmPassword: "", password: "" },
    mode: "onChange",
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = useCallback(
    async (values: ResetPasswordFormValues) => {
      try {
        await setPassword.mutateAsync({ newPassword: values.password })
      } catch (error) {
        toast.error(t("errorTitle"), { description: actionError(error) })
        await queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE })

        return
      }

      form.reset()
      onOpenChange(false)
      toast.success(t("successTitle"), { description: t("successDescription") })
      await queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE })
    },
    [actionError, form, onOpenChange, queryClient, setPassword, t],
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
              autoComplete="new-password"
              control={form.control}
              id="set-password"
              label={t("newPassword")}
              name="password"
            />
            <AuthPasswordField
              autoComplete="new-password"
              control={form.control}
              id="confirm-set-password"
              label={t("confirmPassword")}
              name="confirmPassword"
            />
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

interface SetPasswordDialogProps {
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
