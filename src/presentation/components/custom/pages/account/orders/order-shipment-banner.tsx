import { type JSX } from "react"

import { Truck } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { TrackingNumberRow } from "~/src/presentation/components/custom/pages/account/orders/order-tracking-number-row"

export const ShipmentBanner = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element | undefined => {
  const t = useTranslations("pages.account.orderDetail")
  const format = useFormatter()

  const shipmentDate = order.deliveredAt ?? order.shippedAt
  if (shipmentDate === undefined) {
    return undefined
  }

  const date = format.dateTime(shipmentDate, { dateStyle: "medium" })
  const headline =
    order.deliveredAt === undefined
      ? t(order.trackingNumber === undefined ? "shippedOn" : "inTransitSince", { date })
      : t("deliveredOn", { date })

  return (
    <div className="mb-10 flex items-center gap-4 bg-muted/50 px-5 py-4">
      <Truck className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.2} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">{headline}</p>
        {order.trackingNumber === undefined ? undefined : (
          <TrackingNumberRow trackingNumber={order.trackingNumber} trackingUrl={order.trackingUrl} />
        )}
      </div>
    </div>
  )
}
