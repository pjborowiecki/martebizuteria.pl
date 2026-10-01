import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { getAdminOrderItemRows, getOrderByTransactionId } from "~/src/modules/order/order.accessors"
import { ORDER_QUERY_KEYS, ORDER_QUERY_STALE_MS } from "~/src/modules/order/order.constants"
import { mapAdminOrderDetailAddress, mapAdminOrderDetailItem } from "~/src/modules/order/order.detail.utils"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const getOrderConfirmation = createServerFn({ method: "GET" })
  .validator((input: zod.input<typeof orderZodSchemas.orderConfirmationInput>) => orderZodSchemas.orderConfirmationInput.parse(input))
  .handler(async ({ data: { sessionId } }): Promise<Order["confirmation"] | undefined> => {
    const orderRow = await getOrderByTransactionId(sessionId)
    if (orderRow === undefined) {
      return undefined
    }

    const [itemRows, session] = await Promise.all([getAdminOrderItemRows(orderRow.id), getRequestSession()])

    return {
      createdAt: orderRow.createdAt,
      currencyCode: orderRow.currencyCode,
      deliveryMethodName: orderRow.deliveryMethod?.name,
      discountTotalMinorUnits: orderRow.discountTotal,
      email: orderRow.email,
      id: orderRow.id,
      isGuestOrder: orderRow.userId === null,
      isOwnOrder: orderRow.userId !== null && orderRow.userId === session?.user.id,
      items: itemRows.map((row) => mapAdminOrderDetailItem(row)),
      orderNumber: orderRow.orderNumber,
      shippingAddress: mapAdminOrderDetailAddress(orderRow.checkout?.shippingAddress),
      shippingTotalMinorUnits: orderRow.shippingTotal,
      subtotalMinorUnits: orderRow.subtotal,
      taxBasisPoints: orderRow.taxBasisPoints,
      taxTotalMinorUnits: orderRow.taxTotal,
      totalMinorUnits: orderRow.total,
    }
  })

export const getOrderConfirmationQuery = (sessionId: string) =>
  queryOptions({
    enabled: sessionId !== "",
    queryFn: () => getOrderConfirmation({ data: { sessionId } }),
    queryKey: [...ORDER_QUERY_KEYS.CONFIRMATION, sessionId],
    retry: CONFIRMATION_RETRIES,
    retryDelay: CONFIRMATION_RETRY_DELAY_MS,
    staleTime: ORDER_QUERY_STALE_MS,
  })

const CONFIRMATION_RETRIES = 5

const CONFIRMATION_RETRY_DELAY_MS = 1500
