import { type JSX, useCallback, useMemo, useState } from "react"

import { Loader2, Trash2 } from "lucide-react"
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
  AlertDialogTrigger,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Button } from "~/src/presentation/components/shadcn/button"

import { useDeleteAuditLogs } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-delete-audit-logs"
import { auditDataGrid } from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-data-grid"

export const AuditBulkActions = (): JSX.Element | undefined => {
  const t = useTranslations("pages.admin")
  const { table } = auditDataGrid.useDataGrid()
  const [open, setOpen] = useState(false)
  const deleteAuditLogs = useDeleteAuditLogs()
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const count = String(selectedRows.length)
  const handleConfirm = useCallback(() => {
    const ids = selectedRows.map((row) => row.original.id)
    deleteAuditLogs.mutate(ids, {
      onSuccess: () => {
        table.resetRowSelection()
        setOpen(false)
      },
    })
  }, [deleteAuditLogs, selectedRows, table])

  const trigger = useMemo(
    () => (
      <Button variant="outline" size="sm" className="h-9 gap-2 border-destructive/30 text-xs text-destructive hover:bg-destructive/10">
        <Trash2 className="size-3.5" strokeWidth={1.5} />
        {t("audit.bulk.delete", {
          count,
        })}
      </Button>
    ),
    [count, t],
  )

  if (selectedRows.length === 0) {
    return undefined
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
        {t("audit.bulk.selected", {
          count,
        })}
      </span>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={trigger} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("audit.bulk.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("audit.bulk.confirmDescription", {
                count,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAuditLogs.isPending}>{t("audit.bulk.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={deleteAuditLogs.isPending} className="gap-1.5">
              {deleteAuditLogs.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("audit.bulk.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
