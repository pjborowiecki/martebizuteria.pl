import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { customerOrderItemThumbnail, customerOrderItemVariantTitle } from "~/src/modules/customer-account/customer-account.accessors.server"
import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import {
  mapCustomerAccountAddressRow,
  mapCustomerOrderDetail,
  mapOrderAddressSnapshotRow,
} from "~/src/modules/customer-account/customer-account.utils"
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { order } from "~/src/modules/order/order.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { product } from "~/src/modules/product/product.schema"

export const getCustomerOrder = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof customerAccountZodSchemas.orderIdInput>) => customerAccountZodSchemas.orderIdInput.parse(input))
  .handler(async ({ context, data: { orderId } }): Promise<CustomerAccount["orderDetail"] | undefined> => {
    const orderRow = await db.query.order.findFirst({
      where: and(eq(order.id, orderId), eq(order.userId, context.auth.user.id)),
      with: {
        addresses: true,
        checkout: {
          with: {
            billingAddress: true,
            shippingAddress: true,
          },
        },
        deliveryMethod: { with: { courier: true } },
        payment: true,
      },
    })

    if (orderRow === undefined) {
      return undefined
    }

    const items = await db
      .select({
        handle: product.handle,
        id: orderItem.id,
        quantity: orderItem.quantity,
        thumbnail: customerOrderItemThumbnail,
        title: orderItem.title,
        total: orderItem.total,
        unitPrice: orderItem.unitPrice,
        variantTitle: customerOrderItemVariantTitle,
      })
      .from(orderItem)
      .leftJoin(productVariant, eq(orderItem.variantId, productVariant.id))
      .leftJoin(product, eq(productVariant.productId, product.id))
      .where(eq(orderItem.orderId, orderId))
      .orderBy(asc(orderItem.createdAt))

    const snapshots = orderRow.addresses
    const billingSnapshot = snapshots.find((row) => row.type === "billing")
    const shippingSnapshot = snapshots.find((row) => row.type === "shipping")

    return mapCustomerOrderDetail(orderRow, items, {
      billingAddress: mapOrderAddressSnapshotRow(billingSnapshot) ?? mapCustomerAccountAddressRow(orderRow.checkout?.billingAddress),
      deliveryMethodName: orderRow.deliveryMethod?.name,
      deliveryMethodType: orderRow.deliveryMethod?.type,
      payment: orderRow.payment,
      shippingAddress: mapOrderAddressSnapshotRow(shippingSnapshot) ?? mapCustomerAccountAddressRow(orderRow.checkout?.shippingAddress),
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
