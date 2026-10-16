import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"

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
import { OrderTrackingFields } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-tracking-fields"

export const OrderTrackingDialog = ({ isPending, onConfirm, onOpenChange, open }: Readonly<OrderTrackingDialogProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")
  const enteredTrackingNumber = trackingNumber.trim()

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isPending) {
        return
      }

      setTrackingNumber("")
      setTrackingUrl("")
      onOpenChange(nextOpen)
    },
    [isPending, onOpenChange],
  )

  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      onConfirm({
        trackingNumber: enteredTrackingNumber,
        trackingUrl: trackingUrl.trim() === "" ? undefined : trackingUrl.trim(),
      })
    },
    [enteredTrackingNumber, onConfirm, trackingUrl],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("orderDetail.trackingDialog.title")}</DialogTitle>
            <DialogDescription>
              <span className="block">{t("orderDetail.trackingDialog.description")}</span>
              <AdminDialogNote kind="email">
                {t("orderDetail.trackingDialog.emailNote", { email: t(`audit.details.emails.${ORDER_EMAIL_KIND.TRACKING}`) })}
              </AdminDialogNote>
            </DialogDescription>
          </DialogHeader>

          <OrderTrackingFields
            onTrackingNumberChange={setTrackingNumber}
            onTrackingUrlChange={setTrackingUrl}
            trackingNumber={trackingNumber}
            trackingNumberRequired
            trackingUrl={trackingUrl}
          />

          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => {
                handleOpenChange(false)
              }}
              type="button"
              variant="outline"
            >
              {t("orderDetail.shipDialog.cancel")}
            </Button>
            <Button className="gap-1.5" disabled={isPending || enteredTrackingNumber === ""} type="submit">
              {isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("orderDetail.trackingDialog.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface OrderTrackingDialogProps {
  readonly isPending: boolean
  readonly onConfirm: (tracking: { readonly trackingNumber: string; readonly trackingUrl: string | undefined }) => void
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
