import { type JSX } from "react"

import { AlertTriangle, Copy, ExternalLink, Package, Truck } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { describeOrderLocker, resolveAdminOrderDeliveryLocker } from "~/src/modules/order/order.detail.utils"
import { formatOrderAddressLocality } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { ADMIN_CARD_CONTENT_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/_styles/order-detail.styles"
import { OrderAddressLines } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-address-lines"
import {
  OrderLockerDestination,
  OrderLockerRecipient,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/order-locker-destination"

const formatAddressForClipboard = (address: Order["adminOrderDetailAddress"], locale: string): string =>
  [address.name, address.line1, address.line2, formatOrderAddressLocality(address, locale), address.phone]
    .filter((line) => line !== undefined)
    .join("\n")

const describeDeliveryMethod = ({ courierName, methodName }: NonNullable<Order["adminOrderDetail"]["delivery"]>): string =>
  courierName === undefined || methodName.includes(courierName) ? methodName : `${courierName} — ${methodName}`

const CopyButton = ({ label, onCopy }: Readonly<{ label: string; onCopy: () => void }>): JSX.Element => (
  <Button
    aria-label={label}
    className="relative size-7 text-muted-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-1.5"
    onClick={onCopy}
    size="icon"
    variant="ghost"
  >
    <Copy className="size-3.5" strokeWidth={1.5} />
  </Button>
)

const ShippingDestination = ({ delivery, shippingAddress }: Readonly<Omit<OrderShippingCardProps, "trackingNumber" | "trackingUrl">>) => {
  const t = useTranslations("pages.admin.orderDetail.shipping")
  const locale = useLocale()
  const locker = resolveAdminOrderDeliveryLocker(delivery)

  if (locker !== undefined) {
    return (
      <>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{t("lockerTitle")}</p>
          <CopyButton
            label={t("copyLocker")}
            onCopy={() => {
              void navigator.clipboard.writeText(describeOrderLocker(locker).join("\n"))
              toast.success(t("lockerCopied"))
            }}
          />
        </div>
        <OrderLockerDestination code={locker.code} point={locker.point} />
        {delivery?.lockerUnconfirmed === true && (
          <div className="mt-3 flex items-start gap-2.5 text-[13px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
            <span>{t("lockerUnconfirmed")}</span>
          </div>
        )}
        <Separator className="my-4 bg-border/40" />
        <OrderLockerRecipient address={shippingAddress} />
      </>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">{t("title")}</p>
        {shippingAddress !== undefined && (
          <CopyButton
            label={t("copy")}
            onCopy={() => {
              void navigator.clipboard.writeText(formatAddressForClipboard(shippingAddress, locale))
              toast.success(t("copied"))
            }}
          />
        )}
      </div>
      {shippingAddress === undefined ? (
        <p className="text-[13px] text-muted-foreground">{t("missing")}</p>
      ) : (
        <OrderAddressLines address={shippingAddress} />
      )}
    </>
  )
}

export const OrderShippingCard = ({
  delivery,
  shippingAddress,
  trackingNumber,
  trackingUrl,
}: Readonly<OrderShippingCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.shipping")

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className={ADMIN_CARD_CONTENT_CLASS}>
        <ShippingDestination delivery={delivery} shippingAddress={shippingAddress} />

        {(delivery !== undefined || trackingNumber !== undefined) && <Separator className="my-4 bg-border/40" />}

        <div className="space-y-2.5">
          {delivery !== undefined && (
            <div className="flex items-center gap-2.5 text-sm">
              <Truck className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="text-muted-foreground">{describeDeliveryMethod(delivery)}</span>
            </div>
          )}
          {trackingNumber !== undefined && (
            <div className="flex items-center gap-2.5 text-sm">
              <Package className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="font-mono text-xs text-muted-foreground">{trackingNumber}</span>
              {trackingUrl !== undefined && (
                <a
                  aria-label={t("openTracking")}
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
