import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { mapCustomerAccountAddressRow, mapCustomerOrderDetail } from "~/src/modules/customer-account/customer-account.utils"
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { order } from "~/src/modules/order/order.schema"

export const getCustomerOrder = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof customerAccountZodSchemas.orderIdInput>) => customerAccountZodSchemas.orderIdInput.parse(input))
  .handler(async ({ context, data: { orderId } }): Promise<CustomerAccount["orderDetail"] | undefined> => {
    const orderRow = await db.query.order.findFirst({
      where: and(eq(order.id, orderId), eq(order.userId, context.auth.user.id)),
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
      billingAddress: mapCustomerAccountAddressRow(orderRow.checkout?.billingAddress),
      paymentProvider: orderRow.payment?.provider,
      shippingAddress: mapCustomerAccountAddressRow(orderRow.checkout?.shippingAddress),
    })
  })

export const getCustomerOrderQuery = (orderId: string) =>
  queryOptions({
    queryFn: async () => {
      const detail = await getCustomerOrder({ data: { orderId } })

      if (detail === undefined) {
        throw notFound()
      }

      return detail
    },
    queryKey: [...CUSTOMER_ACCOUNT_QUERY_KEYS.ORDER_BY_ID, orderId],
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
