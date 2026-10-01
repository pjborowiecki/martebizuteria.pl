import { type JSX, type SyntheticEvent, useCallback } from "react"

import { type ErrorContext } from "@better-fetch/fetch"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClientOnlyFn } from "@tanstack/react-start"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { type ChangeEmailFormValues, changeEmailSchema } from "~/src/integrations/better-auth/auth.zod"

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

import { AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

const changeEmailRequest = createClientOnlyFn((input: Parameters<typeof authClient.changeEmail>[0]) => authClient.changeEmail(input))

export const ChangeEmailDialog = ({ currentEmail, onOpenChange, open }: Readonly<ChangeEmailDialogProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile.emailDialog")
  const actionError = useActionError()
  const form = useForm<ChangeEmailFormValues>({
    defaultValues: { email: "" },
    mode: "onTouched",
    resolver: zodResolver(changeEmailSchema),
  })

  const onSubmit = useCallback(
    async (values: ChangeEmailFormValues) => {
      await changeEmailRequest({
        fetchOptions: {
          onError: (ctx: ErrorContext) => {
            toast.error(t("errorTitle"), { description: actionError(ctx.error) })
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description", { email: currentEmail })}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <AuthTextField autoComplete="email" control={form.control} id="new-email" label={t("newEmail")} name="email" type="email" />
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
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
