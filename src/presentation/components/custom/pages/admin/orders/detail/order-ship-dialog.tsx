import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type AdminOrderAdvancedStep } from "~/src/modules/order/order.constants"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"

import { OrderCustomerEmailNote } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-customer-email-note"
import { OrderTrackingFields } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-tracking-fields"

export const OrderShipDialog = ({
  emailedSteps,
  isPending,
  onConfirm,
  onOpenChange,
  open,
}: Readonly<OrderShipDialogProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.shipDialog")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")

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
        trackingNumber: trackingNumber.trim() === "" ? undefined : trackingNumber.trim(),
        trackingUrl: trackingUrl.trim() === "" ? undefined : trackingUrl.trim(),
      })
    },
    [onConfirm, trackingNumber, trackingUrl],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-prevent-row-click>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              <span className="block">{t("description")}</span>
              <OrderCustomerEmailNote emailedSteps={emailedSteps} step="shipped" />
            </DialogDescription>
          </DialogHeader>

          <OrderTrackingFields
            onTrackingNumberChange={setTrackingNumber}
            onTrackingUrlChange={setTrackingUrl}
            trackingNumber={trackingNumber}
            trackingNumberRequired={false}
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
              {t("cancel")}
            </Button>
            <Button className="gap-1.5" disabled={isPending} type="submit">
              {isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface OrderShipDialogProps {
  readonly emailedSteps: readonly AdminOrderAdvancedStep[]
  readonly isPending: boolean
  readonly onConfirm: (tracking: { readonly trackingNumber: string | undefined; readonly trackingUrl: string | undefined }) => void
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
