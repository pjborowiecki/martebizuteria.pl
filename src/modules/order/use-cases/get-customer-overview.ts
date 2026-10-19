import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/_core/constants/customer-account"
import { getCustomerActivityAuditRows } from "~/src/modules/audit-log/audit-log.accessors"
import { mapAuditLogToActivityItem } from "~/src/modules/audit-log/audit-log.utils"
import {
  getCustomerOrderNumbers,
  getCustomerOrderRows,
  getCustomerPurchasedCategoryIds,
  getCustomerPurchasedProductIds,
  getCustomerSpendStats,
  getOrderItemsForOrders,
} from "~/src/modules/order/order.accessors"
import {
  CUSTOMER_ACCOUNT_OVERVIEW_ACTIVITY_LIMIT,
  CUSTOMER_ACCOUNT_OVERVIEW_ORDERS_LIMIT,
  CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT,
  ORDER_QUERY_KEYS,
} from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"
import { mapCustomerOrderSummaryRow } from "~/src/modules/order/use-cases/list-customer-orders.server"
import { getPublishedProductsByCategoryIds, getPublishedProductsByCollectionHandle } from "~/src/modules/product/product.accessors"
import { LANDING_NEW_ARRIVALS_COLLECTION_HANDLE } from "~/src/modules/product/product.constants"
import { resolveProductTitle } from "~/src/modules/product/product.utils"
import { getUserById } from "~/src/modules/user/user.accessors"
import { countWishlistItems } from "~/src/modules/wishlist-item/wishlist-item.accessors"

import { getProductImageUrl } from "~/src/lib/image"

const NO_CATEGORIES = 0

const localeInputSchema = zod
  .object({
    locale: zod.string().optional(),
  })
  .default({})

type RecommendedProducts = Awaited<ReturnType<typeof getPublishedProductsByCollectionHandle>>

const toRecommendations = (items: RecommendedProducts, locale: string): Order["customerOverview"]["recommendations"] =>
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
  locale: string,
): Promise<{ recommendations: Order["customerOverview"]["recommendations"]; source: "newArrivals" | "orders" }> => {
  const [categoryIds, purchasedProductIds] = await Promise.all([
    getCustomerPurchasedCategoryIds(userId),
    getCustomerPurchasedProductIds(userId),
  ])

  if (categoryIds.length > NO_CATEGORIES) {
    const items = await getPublishedProductsByCategoryIds(categoryIds, {
      limit: CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT + purchasedProductIds.length,
      offset: 0,
    })
    const unseen = items.filter((productRow) => !purchasedProductIds.includes(productRow.id))

    if (unseen.length > NO_CATEGORIES) {
      return { recommendations: toRecommendations(unseen.slice(0, CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT), locale), source: "orders" }
    }
  }

  const items = await getPublishedProductsByCollectionHandle(LANDING_NEW_ARRIVALS_COLLECTION_HANDLE, {
    limit: CUSTOMER_ACCOUNT_RECOMMENDATIONS_LIMIT,
    offset: 0,
  })

  return { recommendations: toRecommendations(items, locale), source: "newArrivals" }
}

export const getCustomerOverview = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: zod.input<typeof localeInputSchema>) => localeInputSchema.parse(input))
  .handler(async ({ context, data }): Promise<Order["customerOverview"]> => {
    const locale = data.locale ?? I18N.DEFAULT_LOCALE
    const userId = context.auth.user.id
    const orderNumberRows = await getCustomerOrderNumbers(userId)
    const [orderRows, spendStats, auditRows, userRow, wishlistCount] = await Promise.all([
      getCustomerOrderRows(userId, { limit: CUSTOMER_ACCOUNT_OVERVIEW_ORDERS_LIMIT }),
      getCustomerSpendStats(userId),
      getCustomerActivityAuditRows(
        userId,
        orderNumberRows.map((row) => row.id),
      ),
      getUserById(userId),
      countWishlistItems(userId),
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

    const { recommendations, source } = await buildCustomerRecommendations(userId, locale)
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
    queryKey: [...ORDER_QUERY_KEYS.CUSTOMER.OVERVIEW, locale],
    staleTime: CUSTOMER_ACCOUNT_QUERY_STALE_MS,
  })
