import { type JSX } from "react"

import { type Order } from "~/src/modules/order/order.types"

import { OrderBillingCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-billing-card"
import { OrderCustomerCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-customer-card"
import { OrderFulfillmentTracker } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-fulfillment-tracker"
import { OrderLineItemsCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-line-items-card"
import { OrderMetaStrip } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-meta-strip"
import { OrderNotesCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-notes-card"
import { OrderPaymentCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-payment-card"
import { OrderShippingCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-shipping-card"
import { OrderTagsCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-tags-card"
import { OrderTimelineCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-timeline-card"

export const OrderDetailPage = ({ order }: Readonly<OrderDetailPageProps>): JSX.Element => (
  <div className="min-h-0 flex-1 overflow-y-auto p-8">
    <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <OrderMetaStrip order={order} />
        <OrderFulfillmentTracker canceledAt={order.canceledAt} steps={order.fulfillmentSteps} />
        <OrderLineItemsCard order={order} />
        <OrderTimelineCard timeline={order.timeline} />
      </div>

      <div className="space-y-6">
        <OrderCustomerCard currencyCode={order.currencyCode} customer={order.customer} />
        <OrderShippingCard
          delivery={order.delivery}
          shippingAddress={order.shippingAddress}
          trackingNumber={order.trackingNumber}
          trackingUrl={order.trackingUrl}
        />
        <OrderBillingCard billingAddress={order.billingAddress} sameAsShipping={order.billingSameAsShipping} />
        <OrderPaymentCard currencyCode={order.currencyCode} payment={order.payment} />
        <OrderTagsCard tags={order.tags} />
        <OrderNotesCard customerNote={order.customerNote} />
      </div>
    </div>
  </div>
)

interface OrderDetailPageProps {
  readonly order: Order["adminOrderDetail"]
}
