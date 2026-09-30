import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getCustomerOrderRows, getOrderItemsForOrders } from "~/src/modules/customer-account/customer-account.accessors.server"
import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { mapCustomerOrderSummaryRow } from "~/src/modules/customer-account/customer-account.utils"

export const listCustomerOrders = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }): Promise<readonly CustomerAccount["orderSummary"][]> => {
    const orderRows = await getCustomerOrderRows(context.auth.user.id)
    const orderIds = orderRows.map((row) => row.id)
    const itemRows = await getOrderItemsForOrders(orderIds)
    const itemsByOrderId = new Map<string, typeof itemRows>()

    for (const itemRow of itemRows) {
      const current = itemsByOrderId.get(itemRow.orderId) ?? []
      current.push(itemRow)
      itemsByOrderId.set(itemRow.orderId, current)
    }

    return orderRows.map((row) => mapCustomerOrderSummaryRow(row, itemsByOrderId.get(row.id) ?? []))
  })

export const listCustomerOrdersQuery = () =>
  queryOptions({
    queryFn: () => listCustomerOrders(),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.ORDERS,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
