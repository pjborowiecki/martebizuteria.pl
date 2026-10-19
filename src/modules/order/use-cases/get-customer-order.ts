import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/_core/constants/customer-account"
import { orderItem } from "~/src/modules/order-item/order-item.schema"
import { customerOrderItemThumbnail, customerOrderItemVariantTitle } from "~/src/modules/order/order.accessors"
import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { order } from "~/src/modules/order/order.schema"
import { type Order } from "~/src/modules/order/order.types"
import { mapAdminOrderDetailAddress } from "~/src/modules/order/order.utils"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { mapCustomerOrderDetail } from "~/src/modules/order/use-cases/get-customer-order.server"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { product } from "~/src/modules/product/product.schema"

export const getCustomerOrder = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof orderZodSchemas.customerOrderIdInput>) => orderZodSchemas.customerOrderIdInput.parse(input))
  .handler(async ({ context, data: { orderId } }): Promise<Order["customerOrderDetail"] | undefined> => {
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
      billingAddress: mapAdminOrderDetailAddress(billingSnapshot ?? orderRow.checkout?.billingAddress),
      deliveryCourierCode: orderRow.deliveryMethod?.courier.internalCode,
      deliveryMethodName:
        orderRow.deliveryMethod === null ? undefined : resolveLocalizedString(orderRow.deliveryMethod.names, getCurrentLocale()),
      deliveryMethodType: orderRow.deliveryMethod?.type,
      payment: orderRow.payment,
      shippingAddress: mapAdminOrderDetailAddress(shippingSnapshot ?? orderRow.checkout?.shippingAddress),
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
    queryKey: [...ORDER_QUERY_KEYS.CUSTOMER.ORDER_BY_ID, orderId],
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
