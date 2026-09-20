import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { getCustomerOrderRows, getOrderItemsForOrders } from "~/src/modules/customer-account/customer-account.accessors.server"
import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccountOrderSummary } from "~/src/modules/customer-account/customer-account.types"
import { mapCustomerOrderSummaryRow } from "~/src/modules/customer-account/customer-account.utils"

export const fetchCustomerOrdersFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<readonly CustomerAccountOrderSummary[]> => {
    const authSession = await getRequestSession()
    if (authSession?.user === undefined) {
      return []
    }

    const orderRows = await getCustomerOrderRows(authSession.user.id)
    const orderIds = orderRows.map((row) => row.id)
    const itemRows = await getOrderItemsForOrders(orderIds)
    const itemsByOrderId = new Map<string, typeof itemRows>()

    for (const itemRow of itemRows) {
      const current = itemsByOrderId.get(itemRow.orderId) ?? []
      current.push(itemRow)
      itemsByOrderId.set(itemRow.orderId, current)
    }

    return orderRows.map((row) => mapCustomerOrderSummaryRow(row, itemsByOrderId.get(row.id) ?? []))
  },
)

export const ordersQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchCustomerOrdersFn(),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.ORDERS,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
