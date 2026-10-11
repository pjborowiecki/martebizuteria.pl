import { type JSX } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/src/presentation/components/shadcn/alert-dialog"

export const NewsletterSendDialog = ({
  isPending,
  onConfirm,
  onOpenChange,
  open,
  recipientCount,
}: Readonly<NewsletterSendDialogProps>): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.composer.confirm")
  const stayOpenWhileSending = (next: boolean): void => {
    if (!isPending) {
      onOpenChange(next)
    }
  }

  return (
    <AlertDialog onOpenChange={stayOpenWhileSending} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description", { count: recipientCount })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction className="gap-1.5" disabled={isPending} onClick={onConfirm} type="button">
            {isPending && <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />}
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface NewsletterSendDialogProps {
  readonly isPending: boolean
  readonly onConfirm: () => void
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly recipientCount: number
}
