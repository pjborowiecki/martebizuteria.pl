import { type JSX, type SyntheticEvent } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"

import { USER_ERROR_CODES } from "~/src/modules/user/user.constants"
import { type CloseAccountFormValues, closeAccountFormSchema } from "~/src/modules/user/user.zod"

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
import {
  CloseAccountCredential,
  PROFILE_VALIDATION_NAMESPACE,
} from "~/src/presentation/components/custom/pages/account/profile/sections/close-account-credential"
import { AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

const INVALID_PASSWORD_CODE = "INVALID_PASSWORD"

const deleteAccountRequest = createClientOnlyFn((input: Parameters<typeof authClient.deleteUser>[0]) => authClient.deleteUser(input))

const closeAccountErrorKey = (
  code: string | undefined,
): "closeAccountError" | "closeAdminAccountError" | "closeStripeCustomerError" | "closeWrongPassword" => {
  if (code === INVALID_PASSWORD_CODE) {
    return "closeWrongPassword"
  }

  if (code === USER_ERROR_CODES.STRIPE_CUSTOMER_NOT_DELETED) {
    return "closeStripeCustomerError"
  }

  return code === USER_ERROR_CODES.CANNOT_DELETE_ADMIN ? "closeAdminAccountError" : "closeAccountError"
}

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
      toast.error(t(closeAccountErrorKey(error.code)))

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
      <DialogContent className="sm:max-w-md" variant="editorial">
        <form onSubmit={submit}>
          <DialogHeader>
            <AccountDialogEyebrow destructive>{t("closeAccount")}</AccountDialogEyebrow>
            <DialogTitle>{t("closeDialogTitle")}</DialogTitle>
            <DialogDescription>{t("closeDialogDesc")}</DialogDescription>
          </DialogHeader>

          <ul className="mt-5 space-y-2.5 border-l border-destructive/30 pl-4 text-[13px] leading-relaxed text-muted-foreground">
            <li>{t("closeDialogPoint1")}</li>
            <li>{t("closeDialogPoint2")}</li>
            <li>{t("closeDialogPoint3")}</li>
            <li>{t("closeDialogPoint4")}</li>
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
