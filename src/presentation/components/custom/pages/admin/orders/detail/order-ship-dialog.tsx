import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { ORDER_TRACKING_NUMBER_MAX_LENGTH, ORDER_TRACKING_URL_MAX_LENGTH } from "~/src/modules/order/order.constants"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"

export const OrderShipDialog = ({ isPending, onConfirm, onOpenChange, open }: Readonly<OrderShipDialogProps>): JSX.Element => {
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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tracking-number">{t("trackingNumberLabel")}</Label>
              <Input
                autoComplete="off"
                id="tracking-number"
                maxLength={ORDER_TRACKING_NUMBER_MAX_LENGTH}
                onChange={(event) => {
                  setTrackingNumber(event.target.value)
                }}
                placeholder={t("trackingNumberPlaceholder")}
                value={trackingNumber}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking-url">{t("trackingUrlLabel")}</Label>
              <Input
                autoComplete="off"
                id="tracking-url"
                maxLength={ORDER_TRACKING_URL_MAX_LENGTH}
                onChange={(event) => {
                  setTrackingUrl(event.target.value)
                }}
                placeholder={t("trackingUrlPlaceholder")}
                type="url"
                value={trackingUrl}
              />
            </div>
          </div>

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
  readonly isPending: boolean
  readonly onConfirm: (tracking: { readonly trackingNumber: string | undefined; readonly trackingUrl: string | undefined }) => void
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
}
