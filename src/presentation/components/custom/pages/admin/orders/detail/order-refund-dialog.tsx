import { type JSX, useCallback, useState } from "react"

import { Loader2, RotateCcw } from "lucide-react"
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
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"
import { Label } from "~/src/presentation/components/shadcn/label"

const RefundConfirmation = ({ displayId, isPending, onConfirm, restockByDefault }: Readonly<RefundConfirmationProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.refundDialog")
  const [restock, setRestock] = useState(restockByDefault)
  const handleConfirm = useCallback(() => {
    onConfirm(restock)
  }, [onConfirm, restock])

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogMedia tone="destructive">
          <RotateCcw />
        </AlertDialogMedia>
        <AlertDialogTitle>{t("title")}</AlertDialogTitle>
        <AlertDialogDescription>{t("description", { id: displayId })}</AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex items-start gap-3 rounded-lg border border-border/70 p-3.5 has-data-checked:border-foreground/30 has-data-checked:bg-muted/40">
        <Checkbox
          checked={restock}
          className="mt-0.5"
          disabled={isPending}
          id="refund-restock"
          onCheckedChange={(checked) => {
            setRestock(checked)
          }}
        />
        <div className="space-y-1.5">
          <Label className="text-[13px] leading-5 font-medium text-foreground" htmlFor="refund-restock">
            {t("restockLabel")}
          </Label>
          <p className="text-[12px] leading-relaxed text-muted-foreground">{t("restockHint")}</p>
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
        <AlertDialogAction className="gap-1.5" disabled={isPending} onClick={handleConfirm} type="button" variant="destructive">
          {isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
          {t("confirm")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )
}

export const OrderRefundDialog = ({
  displayId,
  isPending,
  onConfirm,
  onOpenChange,
  open,
  restockByDefault,
}: Readonly<OrderRefundDialogProps>): JSX.Element => {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isPending) {
        return
      }

      onOpenChange(nextOpen)
    },
    [isPending, onOpenChange],
  )

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <RefundConfirmation displayId={displayId} isPending={isPending} onConfirm={onConfirm} restockByDefault={restockByDefault} />
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface RefundConfirmationProps {
  readonly displayId: string
  readonly isPending: boolean
  readonly onConfirm: (restock: boolean) => void
  readonly restockByDefault: boolean
}

interface OrderRefundDialogProps extends RefundConfirmationProps {
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
