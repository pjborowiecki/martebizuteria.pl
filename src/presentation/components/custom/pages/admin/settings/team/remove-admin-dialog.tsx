import { type JSX, useCallback } from "react"

import { Loader2, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type User } from "~/src/modules/user/user.types"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/src/presentation/components/shadcn/alert-dialog"

import { useTeamAccess } from "~/src/presentation/components/custom/pages/admin/settings/team/use-team-access"

export const RemoveAdminDialog = ({ member, onClose }: Readonly<RemoveAdminDialogProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.remove")
  const { revoke } = useTeamAccess()

  const confirm = useCallback(() => {
    revoke.mutate(
      { userId: member.id },
      {
        onSettled: onClose,
        onSuccess: () => {
          toast.success(t("removed", { name: member.name }))
        },
      },
    )
  }, [member, onClose, revoke, t])

  return (
    <AlertDialog
      onOpenChange={() => {
        if (!revoke.isPending) {
          onClose()
        }
      }}
      open
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia tone="destructive">
            <ShieldOff />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("title", { name: member.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={revoke.isPending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction className="gap-1.5" disabled={revoke.isPending} onClick={confirm} type="button" variant="destructive">
            {revoke.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface RemoveAdminDialogProps {
  readonly member: User["adminTeamMember"]
  readonly onClose: () => void
}
