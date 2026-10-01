import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  getCustomerActivityAuditRows,
  getCustomerOrderNumbers,
  getCustomerOrderRows,
  getCustomerPurchasedCategoryIds,
  getCustomerPurchasedProductIds,
  getCustomerSpendStats,
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
import { getPublishedProductsByCategoryIds, getPublishedProductsByCollectionId } from "~/src/modules/product/product.accessors"
import { LANDING_NEW_ARRIVALS_COLLECTION_HANDLE } from "~/src/modules/product/product.constants"
import { resolveProductTitle } from "~/src/modules/product/product.utils"
import { getUserById } from "~/src/modules/user/user.accessors"
import { countWishlistItems } from "~/src/modules/wishlist/wishlist.accessors"

import { getProductImageUrl } from "~/src/lib/image"

const NO_CATEGORIES = 0

const localeInputSchema = zod
  .object({
    locale: zod.string().optional(),
  })
  .default({})

type RecommendedProducts = Awaited<ReturnType<typeof getPublishedProductsByCollectionId>>["items"]

const toRecommendations = (items: RecommendedProducts, locale: string): CustomerAccount["overview"]["recommendations"] =>
  items.map((productRow) => {
    const [variant] = productRow.variants

    return {
      handle: productRow.handle,
      image: getProductImageUrl(productRow.thumbnail),
      name: resolveProductTitle(productRow.titles, locale),
      priceMinorUnits: variant?.price,
      productId: productRow.id,
    }
  })

const buildCustomerRecommendations = async (
  userId: string,
  collection: { readonly id: string } | undefined,
  locale: string,
): Promise<{ recommendations: CustomerAccount["overview"]["recommendations"]; source: "newArrivals" | "orders" }> => {
  const [categoryIds, purchasedProductIds] = await Promise.all([
    getCustomerPurchasedCategoryIds(userId),
    getCustomerPurchasedProductIds(userId),
  ])

  if (categoryIds.length > NO_CATEGORIES) {
    const { items } = await getPublishedProductsByCategoryIds(categoryIds, {
      limit: CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT + purchasedProductIds.length,
      offset: 0,
    })
    const unseen = items.filter((productRow) => !purchasedProductIds.includes(productRow.id))

    if (unseen.length > NO_CATEGORIES) {
      return { recommendations: toRecommendations(unseen.slice(0, CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT), locale), source: "orders" }
    }
  }

  if (collection === undefined) {
    return { recommendations: [], source: "newArrivals" }
  }

  const { items } = await getPublishedProductsByCollectionId(collection.id, {
    limit: CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT,
    offset: 0,
  })

  return { recommendations: toRecommendations(items, locale), source: "newArrivals" }
}

export const getCustomerOverview = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof localeInputSchema>) => localeInputSchema.parse(input))
  .handler(async ({ context, data }): Promise<CustomerAccount["overview"]> => {
    const locale = data.locale ?? I18N.DEFAULT_LOCALE
    const userId = context.auth.user.id
    const orderNumberRows = await getCustomerOrderNumbers(userId)
    const [orderRows, spendStats, auditRows, userRow, wishlistCount, collection] = await Promise.all([
      getCustomerOrderRows(userId, { limit: CUSTOMER_ACCOUNT_OVERVIEW_ORDERS_LIMIT }),
      getCustomerSpendStats(userId),
      getCustomerActivityAuditRows(
        userId,
        orderNumberRows.map((row) => row.id),
      ),
      getUserById(userId),
      countWishlistItems(userId),
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

    const orderNumberByOrderId = new Map(orderNumberRows.map((row) => [row.id, row.orderNumber]))
    const activity = auditRows
      .map((row) => mapAuditLogToActivityItem(row, orderNumberByOrderId))
      .filter((item): item is NonNullable<typeof item> => item !== undefined)
      .slice(0, CUSTOMER_ACCOUNT_OVERVIEW_ACTIVITY_LIMIT)

    const { recommendations, source } = await buildCustomerRecommendations(userId, collection, locale)
    const memberSince = userRow?.createdAt ?? context.auth.user.createdAt

    return {
      activity,
      recentOrders: orderRows.map((row) => mapCustomerOrderSummaryRow(row, itemsByOrderId.get(row.id) ?? [])),
      recommendations,
      recommendationsSource: source,
      stats: {
        memberSinceYear: String(memberSince.getFullYear()),
        totalOrders: spendStats.orderCount,
        totalSpentMinorUnits: spendStats.totalSpent,
        wishlistCount,
      },
    }
  })

export const getCustomerOverviewQuery = (locale: string = I18N.DEFAULT_LOCALE) =>
  queryOptions({
    queryFn: () => getCustomerOverview({ data: { locale } }),
    queryKey: [...CUSTOMER_ACCOUNT_QUERY_KEYS.OVERVIEW, locale],
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
