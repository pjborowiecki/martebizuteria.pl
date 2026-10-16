import { type JSX, useCallback, useMemo, useState } from "react"

import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

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
  AlertDialogTrigger,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Button } from "~/src/presentation/components/shadcn/button"

import { useDeleteCoupons } from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-delete-coupons"
import { couponsDataGrid } from "~/src/presentation/components/custom/pages/admin/coupons/utils/coupons-data-grid"

export const CouponsBulkActions = (): JSX.Element | undefined => {
  const t = useTranslations("pages.admin.coupons")
  const { table } = couponsDataGrid.useDataGrid()
  const [open, setOpen] = useState(false)
  const deleteCoupons = useDeleteCoupons()
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const count = String(selectedRows.length)
  const handleConfirm = useCallback(() => {
    deleteCoupons.mutate(
      { ids: selectedRows.map((row) => row.original.id) },
      {
        onSuccess: ({ deleted }) => {
          toast.success(t("toast.bulkDeletedTitle"), { description: t("toast.bulkDeletedDescription", { count: String(deleted) }) })
          table.resetRowSelection()
          setOpen(false)
        },
      },
    )
  }, [deleteCoupons, selectedRows, t, table])

  const trigger = useMemo(
    () => (
      <Button className="h-9 gap-2 border-destructive/30 text-xs text-destructive hover:bg-destructive/10" size="sm" variant="outline">
        <Trash2 className="size-3.5" strokeWidth={1.5} />
        {t("bulk.delete", { count })}
      </Button>
    ),
    [count, t],
  )

  if (selectedRows.length === 0) {
    return undefined
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{t("bulk.selected", { count })}</span>
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogTrigger render={trigger} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia tone="destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("bulk.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("bulk.confirmDescription", { count })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCoupons.isPending}>{t("bulk.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="gap-1.5" disabled={deleteCoupons.isPending} onClick={handleConfirm} variant="destructive">
              {deleteCoupons.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("bulk.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
