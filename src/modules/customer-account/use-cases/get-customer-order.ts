import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccountOrderDetail } from "~/src/modules/customer-account/customer-account.types"
import { mapCustomerAccountAddressRow, mapCustomerOrderDetail } from "~/src/modules/customer-account/customer-account.utils"
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { order } from "~/src/modules/order/order.schema"

export const fetchCustomerOrderByIdFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => customerAccountZodSchemas.orderIdInput.parse(data))
  .handler(async ({ data: { orderId } }): Promise<CustomerAccountOrderDetail | undefined> => {
    const authSession = await getRequestSession()
    if (authSession?.user === undefined) {
      return undefined
    }

    const orderRow = await db.query.order.findFirst({
      where: and(eq(order.id, orderId), eq(order.userId, authSession.user.id)),
      with: {
        checkout: {
          with: {
            billingAddress: true,
            shippingAddress: true,
          },
        },
        payment: true,
      },
    })

    if (orderRow === undefined) {
      return undefined
    }

    const items = await db
      .select({
        quantity: orderItem.quantity,
        thumbnail: orderItem.thumbnail,
        title: orderItem.title,
        total: orderItem.total,
        variantTitle: orderItem.variantTitle,
      })
      .from(orderItem)
      .where(eq(orderItem.orderId, orderId))

    return mapCustomerOrderDetail(orderRow, items, {
      billingAddress: mapCustomerAccountAddressRow(orderRow.checkout?.billingAddress ?? undefined),
      paymentProvider: orderRow.payment?.provider,
      shippingAddress: mapCustomerAccountAddressRow(orderRow.checkout?.shippingAddress ?? undefined),
    })
  })

export const orderByIdQueryOptions = (orderId: string) =>
  queryOptions({
    queryFn: () => fetchCustomerOrderByIdFn({ data: { orderId } }),
    queryKey: [...CUSTOMER_ACCOUNT_QUERY_KEYS.ORDER_BY_ID, orderId] as const,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
