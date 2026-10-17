import { type JSX, useCallback, useState } from "react"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { isAdminTwoFactorRequired } from "~/src/integrations/better-auth/auth.access"

import { type User } from "~/src/modules/user/user.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"

import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"
import { TeamCandidateSearch } from "~/src/presentation/components/custom/pages/admin/settings/team/team-candidate-search"
import { useTeamAccess } from "~/src/presentation/components/custom/pages/admin/settings/team/use-team-access"

const ADMIN_ALLOWANCES = ["allowsOrders", "allowsCatalog", "allowsCustomers", "allowsSettings"] as const

export const AddAdminDialog = ({ onClose }: Readonly<AddAdminDialogProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.add")
  const { grant } = useTeamAccess()
  const [chosen, setChosen] = useState<User["teamCandidate"]>()

  const confirm = useCallback(
    (candidate: User["teamCandidate"]) => {
      grant.mutate(
        { userId: candidate.id },
        {
          onSettled: onClose,
          onSuccess: () => {
            toast.success(t("granted", { name: candidate.name }))
          },
        },
      )
    },
    [grant, onClose, t],
  )

  return (
    <Dialog
      onOpenChange={() => {
        if (!grant.isPending) {
          onClose()
        }
      }}
      open
    >
      <DialogContent>
        {chosen === undefined ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>
            <TeamCandidateSearch onChoose={setChosen} />
            <DialogFooter>
              <Button onClick={onClose} type="button" variant="outline">
                {t("cancel")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("confirmTitle", { name: chosen.name })}</DialogTitle>
              <DialogDescription>{t("confirmIntro", { email: chosen.email })}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-foreground">
                {ADMIN_ALLOWANCES.map((allowance) => (
                  <li key={allowance}>{t(allowance)}</li>
                ))}
              </ul>
              {isAdminTwoFactorRequired() && !chosen.twoFactorEnabled && (
                <AdminDialogNote kind="warning">{t("twoFactorRequired")}</AdminDialogNote>
              )}
            </div>
            <DialogFooter>
              <Button
                disabled={grant.isPending}
                onClick={() => {
                  setChosen(undefined)
                }}
                type="button"
                variant="outline"
              >
                {t("back")}
              </Button>
              <Button
                className="gap-1.5"
                disabled={grant.isPending}
                onClick={() => {
                  confirm(chosen)
                }}
                type="button"
              >
                {grant.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
                {t("confirm")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface AddAdminDialogProps {
  readonly onClose: () => void
}
