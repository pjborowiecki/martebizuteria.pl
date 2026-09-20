import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod/v4"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"

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
import { type CustomerAccountOverview } from "~/src/modules/customer-account/customer-account.types"
import { mapAuditLogToActivityItem, mapCustomerOrderSummaryRow } from "~/src/modules/customer-account/customer-account.utils"
import { getPublishedProductsByCollectionId } from "~/src/modules/product/product.accessors"
import { LANDING_NEW_ARRIVALS_COLLECTION_HANDLE } from "~/src/modules/product/product.constants"
import { resolveProductTitle } from "~/src/modules/product/product.utils"
import { getCustomerOrderStatsQuery, getUserById } from "~/src/modules/user/user.accessors"

import { getProductImageUrl } from "~/src/lib/image"

const localeInputSchema = z.object({
  locale: z.string().optional(),
})

const buildCustomerRecommendations = async (
  collection: { readonly id: string } | undefined,
  locale: string,
): Promise<CustomerAccountOverview["recommendations"]> => {
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

export const fetchCustomerOverviewFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => localeInputSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<CustomerAccountOverview | undefined> => {
    const locale = data.locale ?? DEFAULT_LOCALE
    const authSession = await getRequestSession()
    if (authSession?.user === undefined) {
      return undefined
    }

    const userId = authSession.user.id
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
    const memberSince = userRow?.createdAt ?? authSession.user.createdAt

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

export const overviewQueryOptions = (locale: string = DEFAULT_LOCALE) =>
  queryOptions({
    queryFn: () => fetchCustomerOverviewFn({ data: { locale } }),
    queryKey: [...CUSTOMER_ACCOUNT_QUERY_KEYS.OVERVIEW, locale] as const,
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
