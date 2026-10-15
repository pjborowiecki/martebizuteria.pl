import { type JSX } from "react"

import { type Order } from "~/src/modules/order/order.types"

import { ADMIN_PAGE_BODY_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { OrderBillingCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-billing-card"
import { OrderCustomerCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-customer-card"
import { OrderFulfillmentTracker } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-fulfillment-tracker"
import { OrderInpostCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-inpost-card"
import { OrderLineItemsCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-line-items-card"
import { OrderMetaStrip } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-meta-strip"
import { OrderNotesCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-notes-card"
import { OrderPaymentCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-payment-card"
import { OrderShippingCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-shipping-card"
import { OrderStepBackAction } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-step-back-action"
import { OrderTagsCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-tags-card"
import { OrderTimelineCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-timeline-card"
import { OrderWithdrawalsCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-withdrawals-card"

export const OrderDetailPage = ({ order }: Readonly<OrderDetailPageProps>): JSX.Element => (
  <div className={ADMIN_PAGE_BODY_CLASS}>
    <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <OrderMetaStrip order={order} />
        <OrderWithdrawalsCard withdrawals={order.withdrawals} />
        <OrderFulfillmentTracker canceledAt={order.canceledAt} steps={order.fulfillmentSteps}>
          <OrderStepBackAction order={order} />
        </OrderFulfillmentTracker>
        <OrderLineItemsCard order={order} />
        <OrderTimelineCard orderId={order.id} timeline={order.timeline} />
      </div>

      <div className="space-y-6">
        <OrderCustomerCard currencyCode={order.currencyCode} customer={order.customer} />
        <OrderShippingCard
          delivery={order.delivery}
          shippingAddress={order.shippingAddress}
          trackingNumber={order.trackingNumber}
          trackingUrl={order.trackingUrl}
        />
        <OrderInpostCard order={order} />
        <OrderBillingCard
          billingAddress={order.billingAddress}
          billingCompanyName={order.billingCompanyName}
          billingNip={order.billingNip}
          sameAsShipping={order.billingSameAsShipping}
        />
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
