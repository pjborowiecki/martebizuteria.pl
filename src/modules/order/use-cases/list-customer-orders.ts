import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/_core/constants/customer-account"
import { countCustomerOrders, getCustomerOrderRows, getOrderItemsForOrders } from "~/src/modules/order/order.accessors"
import { CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { mapCustomerOrderSummaryRow } from "~/src/modules/order/order.customer.utils"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

const FIRST_PAGE = 1

export const listCustomerOrders = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof orderZodSchemas.customerOrdersPageInput>) => orderZodSchemas.customerOrdersPageInput.parse(input))
  .handler(async ({ context, data }): Promise<Order["customerOrdersPage"]> => {
    const offset = (data.page - FIRST_PAGE) * CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE
    const [orderRows, total] = await Promise.all([
      getCustomerOrderRows(context.auth.user.id, { filter: data.filter, limit: CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE, offset }),
      countCustomerOrders(context.auth.user.id, data.filter),
    ])

    const itemRows = await getOrderItemsForOrders(orderRows.map((row) => row.id))
    const itemsByOrderId = new Map<string, typeof itemRows>()

    for (const itemRow of itemRows) {
      const current = itemsByOrderId.get(itemRow.orderId) ?? []
      current.push(itemRow)
      itemsByOrderId.set(itemRow.orderId, current)
    }

    return {
      orders: orderRows.map((row) => mapCustomerOrderSummaryRow(row, itemsByOrderId.get(row.id) ?? [])),
      page: data.page,
      pageSize: CUSTOMER_ACCOUNT_ORDERS_PAGE_SIZE,
      total,
    }
  })

export const listCustomerOrdersQuery = (input: zod.input<typeof orderZodSchemas.customerOrdersPageInput> = {}) => {
  const data = orderZodSchemas.customerOrdersPageInput.parse(input)

  return queryOptions({
    queryFn: () => listCustomerOrders({ data }),
    queryKey: [...ORDER_QUERY_KEYS.CUSTOMER.ORDERS, data.filter, data.page],
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
}
