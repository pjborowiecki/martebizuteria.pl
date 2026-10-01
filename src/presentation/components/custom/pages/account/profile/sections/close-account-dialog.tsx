import { type JSX, type SyntheticEvent } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"

import { type CloseAccountFormValues, closeAccountFormSchema } from "~/src/modules/customer-account/customer-account.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"

import {
  CloseAccountCredential,
  PROFILE_VALIDATION_NAMESPACE,
} from "~/src/presentation/components/custom/pages/account/profile/sections/close-account-credential"
import { AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

const INVALID_PASSWORD_CODE = "INVALID_PASSWORD"

const deleteAccountRequest = createClientOnlyFn((input: Parameters<typeof authClient.deleteUser>[0]) => authClient.deleteUser(input))

export const CloseAccountDialog = ({ hasPassword, onOpenChange, open }: Readonly<CloseAccountDialogProps>): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const router = useRouter()
  const form = useForm<CloseAccountFormValues>({
    defaultValues: { confirmation: "", password: "" },
    mode: "onChange",
    resolver: zodResolver(closeAccountFormSchema(hasPassword)),
  })

  const deleteAccount = async (values: CloseAccountFormValues): Promise<void> => {
    const { error } = await deleteAccountRequest(hasPassword ? { password: values.password } : {})

    if (error) {
      toast.error(error.code === INVALID_PASSWORD_CODE ? t("closeWrongPassword") : t("closeAccountError"))

      return
    }

    globalThis.location.href = router.buildLocation({ to: "/" }).publicHref
  }

  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    void form.handleSubmit(deleteAccount)(event)
  }

  const handleOpenChange = (nextOpen: boolean): void => {
    if (form.formState.isSubmitting) {
      return
    }

    if (!nextOpen) {
      form.reset()
    }
    onOpenChange(nextOpen)
  }

  const cancel = (): void => {
    handleOpenChange(false)
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-destructive" strokeWidth={1.5} />
              {t("closeDialogTitle")}
            </DialogTitle>
            <DialogDescription>{t("closeDialogDesc")}</DialogDescription>
          </DialogHeader>

          <ul className="space-y-1.5 pl-4 text-[12px] leading-relaxed text-muted-foreground">
            <li className="list-disc">{t("closeDialogPoint1")}</li>
            <li className="list-disc">{t("closeDialogPoint2")}</li>
            <li className="list-disc">{t("closeDialogPoint3")}</li>
          </ul>

          <div className="space-y-4 py-4">
            <AuthTextField
              autoComplete="off"
              control={form.control}
              id="close-account-confirmation"
              label={t("closeDialogConfirm")}
              name="confirmation"
              validationNamespace={PROFILE_VALIDATION_NAMESPACE}
            />

            <CloseAccountCredential control={form.control} hasPassword={hasPassword} />
          </div>

          <DialogFooter>
            <Button disabled={form.formState.isSubmitting} onClick={cancel} type="button" variant="outline">
              {t("closeDialogCancel")}
            </Button>
            <Button
              className="gap-1.5"
              disabled={!form.formState.isValid || form.formState.isSubmitting}
              type="submit"
              variant="destructive"
            >
              {form.formState.isSubmitting && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("closeDialogAction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CloseAccountDialogProps {
  readonly hasPassword: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
