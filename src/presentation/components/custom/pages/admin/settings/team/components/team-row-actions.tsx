import { type JSX, type MouseEvent, useCallback, useMemo, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { MoreHorizontal, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { listAdminTeamQuery } from "~/src/modules/user/use-cases/list-admin-team"
import { type User } from "~/src/modules/user/user.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

import { suppressNextDataGridRowClick } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
import { useCatalogRowActionMenu } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/lib/use-catalog-row-action-menu"
import { useTeamAccess } from "~/src/presentation/components/custom/pages/admin/settings/team/use-team-access"

export const TeamRowActions = ({ member }: Readonly<{ member: User["adminTeamMember"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team")
  const { data: team } = useSuspenseQuery(listAdminTeamQuery())
  const { revoke } = useTeamAccess()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange, handleMenuOpenChange, menuOpen } = useCatalogRowActionMenu(
    confirmOpen,
    setConfirmOpen,
  )

  const handleRemove = useCallback(
    (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      suppressNextDataGridRowClick()
      closeMenuAndRequestDeleteConfirm()
    },
    [closeMenuAndRequestDeleteConfirm],
  )

  const handleConfirm = useCallback(() => {
    void revoke.mutateAsync({ userId: member.id }).then(
      () => {
        toast.success(t("remove.removed", { name: member.name }))
        handleConfirmOpenChange(false)
      },
      () => {
        handleConfirmOpenChange(false)
      },
    )
  }, [handleConfirmOpenChange, member, revoke, t])

  const stopRowClick = useCallback((event: MouseEvent) => {
    event.stopPropagation()
  }, [])

  const trigger = useMemo(
    () => (
      <Button
        aria-label={t("rowActions.menu", { name: member.name })}
        className="size-8"
        onClick={stopRowClick}
        onPointerDown={stopRowClick}
        size="icon"
        variant="ghost"
      >
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [member.name, stopRowClick, t],
  )

  return (
    <>
      <DropdownMenu onOpenChange={handleMenuOpenChange} open={menuOpen}>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="end" className="min-w-52 p-1.5">
          <DropdownMenuItem
            className="gap-3 px-3 py-2.5 text-[13px]"
            disabled={member.isCurrentUser || !team.recentSignIn}
            onClick={handleRemove}
            variant="destructive"
          >
            <ShieldOff className="size-4" strokeWidth={1.5} />
            {t("admins.remove")}
          </DropdownMenuItem>
          {member.isCurrentUser && (
            <p className="max-w-60 px-3 pt-1 pb-2 text-[12px] leading-snug text-muted-foreground">{t("admins.ownAccess")}</p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CatalogDeleteConfirmDialog
        cancelLabel={t("remove.cancel")}
        confirmLabel={t("remove.confirm")}
        description={t("remove.description")}
        icon={ShieldOff}
        isPending={revoke.isPending}
        onConfirm={handleConfirm}
        onOpenChange={handleConfirmOpenChange}
        open={confirmOpen}
        title={t("remove.title", { name: member.name })}
      />
    </>
  )
}
