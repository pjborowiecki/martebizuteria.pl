import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { RATE_LIMITS, assertWithinRateLimit, withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { fulfillReturnedCheckoutSession } from "~/src/integrations/stripe/stripe.fulfillment.server"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getAdminOrderItemRows, getOrderByTransactionId } from "~/src/modules/order/order.accessors"
import { ORDER_QUERY_KEYS, ORDER_QUERY_STALE_MS } from "~/src/modules/order/order.constants"
import { mapAdminOrderDetailAddress, mapAdminOrderDetailItem, resolveOrderLocker } from "~/src/modules/order/order.detail.utils"
import { type Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { getPaymentByTransactionId } from "~/src/modules/payment/payment.accessors"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

const loadOrPlaceOrder = async (sessionId: string, requestHeaders: Headers) => {
  const payment = await getPaymentByTransactionId(sessionId)
  if (payment?.status === "pending") {
    await assertWithinRateLimit("checkout-status", RATE_LIMITS.CHECKOUT, requestHeaders)
    await fulfillReturnedCheckoutSession(sessionId)
  }

  return getOrderByTransactionId(sessionId)
}

export const getOrderConfirmation = createServerFn({ method: "POST" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof orderZodSchemas.orderConfirmationInput>) => orderZodSchemas.orderConfirmationInput.parse(input))
  .handler(async ({ context, data: { sessionId } }): Promise<Order["confirmation"] | undefined> => {
    const orderRow = await loadOrPlaceOrder(sessionId, context.requestHeaders)
    if (orderRow === undefined) {
      return undefined
    }

    const [itemRows, session] = await Promise.all([getAdminOrderItemRows(orderRow.id), getRequestSession()])

    return {
      createdAt: orderRow.createdAt,
      currencyCode: orderRow.currencyCode,
      deliveryMethodName:
        orderRow.deliveryMethod === null ? undefined : resolveLocalizedString(orderRow.deliveryMethod.names, getCurrentLocale()),
      discountTotalMinorUnits: orderRow.discountTotal,
      email: orderRow.email,
      id: orderRow.id,
      isGuestOrder: orderRow.userId === null,
      isOwnOrder: orderRow.userId !== null && orderRow.userId === session?.user.id,
      items: itemRows.map((row) => mapAdminOrderDetailItem(row)),
      locker: resolveOrderLocker({
        deliveryType: orderRow.deliveryMethod?.type,
        lockerId: orderRow.lockerId,
        lockerPoint: orderRow.lockerPoint,
      }),
      orderNumber: orderRow.orderNumber,
      shippingAddress: mapAdminOrderDetailAddress(
        orderRow.addresses.find((row) => row.type === "shipping") ?? orderRow.checkout?.shippingAddress,
      ),
      shippingTotalMinorUnits: orderRow.shippingTotal,
      subtotalMinorUnits: orderRow.subtotal,
      taxBasisPoints: orderRow.taxBasisPoints,
      taxTotalMinorUnits: orderRow.taxTotal,
      totalMinorUnits: orderRow.total,
    }
  })

const fetchRecordedOrderConfirmation = async (sessionId: string): Promise<Order["confirmation"]> => {
  const confirmation = await getOrderConfirmation({ data: { sessionId } })
  if (confirmation === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND)
  }

  return confirmation
}

export const getOrderConfirmationQuery = (sessionId: string) =>
  queryOptions({
    queryFn: () => fetchRecordedOrderConfirmation(sessionId),
    queryKey: [...ORDER_QUERY_KEYS.CONFIRMATION, sessionId],
    retry: CONFIRMATION_RETRIES,
    staleTime: ORDER_QUERY_STALE_MS,
  })

const CONFIRMATION_RETRIES = 8
