import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  getCustomerActivityAuditRows,
  getCustomerOrderRows,
  getOrderItemsForOrders,
} from "~/src/modules/customer-account/customer-account.accessors.server"
import {
  CUSTOMER_ACCOUNT_OVERVIEW_ACTIVITY_LIMIT,
  CUSTOMER_ACCOUNT_OVERVIEW_ORDERS_LIMIT,
  CUSTOMER_ACCOUNT_QUERY_KEYS,
  CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT,
} from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { mapAuditLogToActivityItem, mapCustomerOrderSummaryRow } from "~/src/modules/customer-account/customer-account.utils"
import { getPublishedProductsByCollectionId } from "~/src/modules/product/product.accessors"
import { LANDING_NEW_ARRIVALS_COLLECTION_HANDLE } from "~/src/modules/product/product.constants"
import { resolveProductTitle } from "~/src/modules/product/product.utils"
import { getCustomerOrderStatsQuery, getUserById } from "~/src/modules/user/user.accessors"

import { getProductImageUrl } from "~/src/lib/image"

const localeInputSchema = zod
  .object({
    locale: zod.string().optional(),
  })
  .default({})

const buildCustomerRecommendations = async (
  collection: { readonly id: string } | undefined,
  locale: string,
): Promise<CustomerAccount["overview"]["recommendations"]> => {
  if (collection === undefined) {
    return []
  }

  const { items } = await getPublishedProductsByCollectionId(collection.id, {
    limit: CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT,
    offset: 0,
  })

  return items.map((productRow) => {
    const [variant] = productRow.variants

    return {
      handle: productRow.handle,
      image: getProductImageUrl(productRow.thumbnail),
      name: resolveProductTitle(productRow.titles, locale),
      priceMinorUnits: variant?.price,
      productId: productRow.id,
    }
  })
}

export const getCustomerOverview = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof localeInputSchema>) => localeInputSchema.parse(input))
  .handler(async ({ context, data }): Promise<CustomerAccount["overview"] | undefined> => {
    const locale = data.locale ?? I18N.DEFAULT_LOCALE
    const userId = context.auth.user.id
    const [orderStatsRows, orderRows, auditRows, userRow, collection] = await Promise.all([
      getCustomerOrderStatsQuery([userId]),
      getCustomerOrderRows(userId, CUSTOMER_ACCOUNT_OVERVIEW_ORDERS_LIMIT),
      getCustomerActivityAuditRows(userId),
      getUserById(userId),
      db.query.productCollection.findFirst({
        where: (collections, { eq: eqOp }) => eqOp(collections.handle, LANDING_NEW_ARRIVALS_COLLECTION_HANDLE),
      }),
    ])

    const orderIds = orderRows.map((row) => row.id)
    const itemRows = await getOrderItemsForOrders(orderIds)
    const itemsByOrderId = new Map<string, typeof itemRows>()

    for (const itemRow of itemRows) {
      const current = itemsByOrderId.get(itemRow.orderId) ?? []
      current.push(itemRow)
      itemsByOrderId.set(itemRow.orderId, current)
    }

    const statsRow = orderStatsRows.find((row) => row.userId === userId) ?? {
      orderCount: 0,
      totalSpent: 0,
    }

    const activity = auditRows
      .map((row) => mapAuditLogToActivityItem(row))
      .filter((item): item is NonNullable<typeof item> => item !== undefined)
      .slice(0, CUSTOMER_ACCOUNT_OVERVIEW_ACTIVITY_LIMIT)

    const recommendations = await buildCustomerRecommendations(collection, locale)
    const memberSince = userRow?.createdAt ?? context.auth.user.createdAt

    return {
      activity,
      recentOrders: orderRows.map((row) => mapCustomerOrderSummaryRow(row, itemsByOrderId.get(row.id) ?? [])),
      recommendations,
      stats: {
        memberSinceYear: String(memberSince.getFullYear()),
        totalOrders: statsRow.orderCount,
        totalSpentMinorUnits: statsRow.totalSpent,
        wishlistCount: 0,
      },
    }
  })

export const getCustomerOverviewQuery = (locale: string = I18N.DEFAULT_LOCALE) =>
  queryOptions({
    queryFn: () => getCustomerOverview({ data: { locale } }),
    queryKey: [...CUSTOMER_ACCOUNT_QUERY_KEYS.OVERVIEW, locale],
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
