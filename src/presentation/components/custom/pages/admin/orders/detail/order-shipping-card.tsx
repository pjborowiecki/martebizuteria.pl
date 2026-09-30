import { type JSX, useCallback } from "react"

import { Box, Copy, ExternalLink, Package, Truck } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { OrderAddressLines } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-address-lines"
import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"

const formatAddressForClipboard = (address: Order["adminOrderDetailAddress"]): string =>
  [
    address.name,
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter((part) => part !== undefined && part !== "").join(" "),
    address.province,
    address.countryCode,
    address.phone,
  ]
    .filter((line) => line !== undefined && line.trim() !== "")
    .join("\n")

export const OrderShippingCard = ({
  delivery,
  shippingAddress,
  trackingNumber,
  trackingUrl,
}: Readonly<OrderShippingCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const handleCopyAddress = useCallback(() => {
    if (shippingAddress === undefined) {
      return
    }
    void navigator.clipboard.writeText(formatAddressForClipboard(shippingAddress))
    toast.success(t("orderDetail.shipping.copied"))
  }, [shippingAddress, t])

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{t("orderDetail.shipping.title")}</p>
          {shippingAddress !== undefined && (
            <Button
              aria-label={t("orderDetail.shipping.copy")}
              className="size-7 text-muted-foreground"
              onClick={handleCopyAddress}
              size="icon"
              variant="ghost"
            >
              <Copy className="size-3.5" strokeWidth={1.5} />
            </Button>
          )}
        </div>
        {shippingAddress === undefined ? (
          <p className="text-[13px] text-muted-foreground">{t("orderDetail.shipping.missing")}</p>
        ) : (
          <OrderAddressLines address={shippingAddress} />
        )}

        {(delivery !== undefined || trackingNumber !== undefined) && <Separator className="my-4 bg-border/40" />}

        <div className="space-y-2.5">
          {delivery !== undefined && (
            <div className="flex items-center gap-2.5 text-sm">
              <Truck className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="text-muted-foreground">
                {delivery.courierName === undefined ? delivery.methodName : `${delivery.courierName} — ${delivery.methodName}`}
              </span>
            </div>
          )}
          {delivery?.lockerId !== undefined && (
            <div className="flex items-center gap-2.5 text-sm">
              <Box className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="font-mono text-xs text-muted-foreground">{delivery.lockerId}</span>
            </div>
          )}
          {trackingNumber !== undefined && (
            <div className="flex items-center gap-2.5 text-sm">
              <Package className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="font-mono text-xs text-muted-foreground">{trackingNumber}</span>
              {trackingUrl !== undefined && (
                <a
                  aria-label={t("orderDetail.shipping.openTracking")}
                  className="ml-auto flex size-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-foreground"
                  href={trackingUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="size-3" strokeWidth={1.5} />
                </a>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface OrderShippingCardProps {
  readonly delivery: Order["adminOrderDetail"]["delivery"]
  readonly shippingAddress: Order["adminOrderDetailAddress"] | undefined
  readonly trackingNumber: string | undefined
  readonly trackingUrl: string | undefined
}
