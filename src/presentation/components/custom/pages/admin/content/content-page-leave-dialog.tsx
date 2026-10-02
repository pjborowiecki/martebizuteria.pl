import { type JSX } from "react"

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

export const ContentPageLeaveDialog = ({ onLeave, onStay, open }: Readonly<ContentPageLeaveDialogProps>): JSX.Element => {
  const t = useTranslations("pages.admin.content.editor.leave")
  const stayOnDismiss = (next: boolean): void => {
    if (!next) {
      onStay?.()
    }
  }

  return (
    <AlertDialog onOpenChange={stayOnDismiss} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>{t("stay")}</AlertDialogCancel>
          <AlertDialogAction onClick={onLeave} variant="destructive">
            {t("leave")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface ContentPageLeaveDialogProps {
  readonly onLeave: (() => void) | undefined
  readonly onStay: (() => void) | undefined
  readonly open: boolean
}
