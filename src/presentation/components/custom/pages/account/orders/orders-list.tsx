import { type JSX } from "react"

import { type CustomerAccountOrderFilter } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { OrderRow } from "~/src/presentation/components/custom/pages/account/orders/order-row"
import { OrdersEmptyState } from "~/src/presentation/components/custom/pages/account/orders/orders-empty-state"

export const OrdersList = ({
  filter,
  orders,
}: Readonly<{
  filter: CustomerAccountOrderFilter
  orders: readonly CustomerAccount["orderSummary"][]
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
