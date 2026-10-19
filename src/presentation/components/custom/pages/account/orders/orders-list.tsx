import { type JSX } from "react"

import { type CustomerAccountOrderFilter } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { OrderRow } from "~/src/presentation/components/custom/pages/account/orders/order-row"
import { OrdersEmptyState } from "~/src/presentation/components/custom/pages/account/orders/orders-empty-state"

export const OrdersList = ({
  filter,
  orders,
}: Readonly<{
  filter: CustomerAccountOrderFilter
  orders: readonly Order["customerOrderSummary"][]
}>): JSX.Element => {
  if (orders.length === 0) {
    return <OrdersEmptyState filter={filter} />
  }

  return (
    <div className="divide-y divide-border pb-10">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </div>
  )
}
