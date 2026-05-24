import type { JSX } from "react";

import { OrderBillingCard } from "~/src/components/custom/pages/admin/orders/detail/order-billing-card";
import { OrderCustomerCard } from "~/src/components/custom/pages/admin/orders/detail/order-customer-card";
import { OrderFulfillmentTracker } from "~/src/components/custom/pages/admin/orders/detail/order-fulfillment-tracker";
import { OrderLineItemsCard } from "~/src/components/custom/pages/admin/orders/detail/order-line-items-card";
import { OrderMetaStrip } from "~/src/components/custom/pages/admin/orders/detail/order-meta-strip";
import { OrderNotesCard } from "~/src/components/custom/pages/admin/orders/detail/order-notes-card";
import { OrderPaymentCard } from "~/src/components/custom/pages/admin/orders/detail/order-payment-card";
import { OrderShippingCard } from "~/src/components/custom/pages/admin/orders/detail/order-shipping-card";
import { OrderTagsCard } from "~/src/components/custom/pages/admin/orders/detail/order-tags-card";
import { OrderTimelineCard } from "~/src/components/custom/pages/admin/orders/detail/order-timeline-card";

export function OrderDetailPage(): JSX.Element {
  return (
    <div className="flex-1 p-8">
      <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
        {/* Main content */}
        <div className="space-y-6">
          <OrderMetaStrip />
          <OrderFulfillmentTracker />
          <OrderLineItemsCard />
          <OrderTimelineCard />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <OrderCustomerCard />
          <OrderShippingCard />
          <OrderBillingCard />
          <OrderPaymentCard />
          <OrderTagsCard />
          <OrderNotesCard />
        </div>
      </div>
    </div>
  );
}
