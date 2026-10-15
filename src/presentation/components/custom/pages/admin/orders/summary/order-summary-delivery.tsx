import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { resolveAdminOrderDeliveryLocker } from "~/src/modules/order/order.detail.utils"
import { type Order } from "~/src/modules/order/order.types"

import { OrderAddressLines } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-address-lines"
import {
  OrderLockerDestination,
  OrderLockerRecipient,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/order-locker-destination"

export const OrderSummaryDelivery = ({ order }: Readonly<{ order: Order["adminOrderDetail"] }>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const locker = resolveAdminOrderDeliveryLocker(order.delivery)

  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{t("orderSummary.delivery")}</h2>
      {order.delivery !== undefined && <p className="text-[13px] font-medium">{order.delivery.methodName}</p>}
      {locker === undefined ? (
        order.shippingAddress !== undefined && <OrderAddressLines address={order.shippingAddress} />
      ) : (
        <>
          <OrderLockerDestination code={locker.code} point={locker.point} />
          <OrderLockerRecipient address={order.shippingAddress} />
        </>
      )}
    </section>
  )
}
