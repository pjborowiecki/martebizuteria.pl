import { type QueryKey } from "@tanstack/react-query"

import { AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"
import { CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { CONTENT_PAGE_QUERY_KEYS } from "~/src/modules/content-page/content-page.constants"
import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { NEWSLETTER_CAMPAIGN_QUERY_KEYS } from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { NEWSLETTER_QUERY_KEYS } from "~/src/modules/newsletter/newsletter.constants"
import { ADMIN_DASHBOARD_QUERY_KEYS, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import { CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"
import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

export const REALTIME_INVALIDATION_HUB = {
  ADMIN: "admin",
  STOREFRONT: "storefront",
} as const

export type RealtimeInvalidationHubName = (typeof REALTIME_INVALIDATION_HUB)[keyof typeof REALTIME_INVALIDATION_HUB]

export const ADMIN_REALTIME_QUERY_PREFIXES = [
  AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE,
  AUDIT_LOG_QUERY_KEYS.ADMIN.STATS,
  ORDER_QUERY_KEYS.ADMIN.ORDERS,
  ADMIN_DASHBOARD_QUERY_KEYS.ALL,
  USER_QUERY_KEYS.ADMIN.CUSTOMERS,
  USER_QUERY_KEYS.ADMIN.TEAM,
  CATEGORY_QUERY_KEYS.ADMIN.ALL,
  CATEGORY_QUERY_KEYS.ADMIN.STATS,
  COLLECTION_QUERY_KEYS.ADMIN.ALL,
  COLLECTION_QUERY_KEYS.ADMIN.STATS,
  PRODUCT_QUERY_KEYS.ADMIN.ALL,
  PRODUCT_QUERY_KEYS.ADMIN.STATS,
  PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL,
  PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.STATS,
  CONTENT_PAGE_QUERY_KEYS.ADMIN.ALL,
  CONTENT_PAGE_QUERY_KEYS.ADMIN.BY_HANDLE,
  STORE_SETTING_QUERY_KEYS.ADMIN.SALES,
  STORE_SETTING_QUERY_KEYS.ADMIN.FREE_DELIVERY,
  STORE_SETTING_QUERY_KEYS.ADMIN.SELLER_DETAILS,
  DELIVERY_METHOD_QUERY_KEYS.ADMIN.ALL,
  NEWSLETTER_CAMPAIGN_QUERY_KEYS.ADMIN.LIST,
  NEWSLETTER_QUERY_KEYS.ADMIN.PAGE,
  NEWSLETTER_QUERY_KEYS.ADMIN.STATS,
] as const satisfies readonly QueryKey[]

export const STOREFRONT_REALTIME_QUERY_PREFIXES = [
  PRODUCT_QUERY_KEYS.ALL,
  PRODUCT_QUERY_KEYS.BY_HANDLE,
  PRODUCT_QUERY_KEYS.LANDING_NEW_ARRIVALS,
  PRODUCT_QUERY_KEYS.RELATED_BY_CATEGORY,
  PRODUCT_QUERY_KEYS.STOREFRONT_PAGE,
  CART_QUERY_KEYS.AVAILABILITY,
  CATEGORY_QUERY_KEYS.ALL,
  CATEGORY_QUERY_KEYS.BY_HANDLE,
  COLLECTION_QUERY_KEYS.ALL,
  COLLECTION_QUERY_KEYS.BY_HANDLE,
  CONTENT_PAGE_QUERY_KEYS.BY_HANDLE,
  STORE_SETTING_QUERY_KEYS.SALES,
  STORE_SETTING_QUERY_KEYS.FREE_DELIVERY,
  STORE_SETTING_QUERY_KEYS.SELLER_DETAILS,
  DELIVERY_METHOD_QUERY_KEYS.ALL,
] as const satisfies readonly QueryKey[]

export const CHECKOUT_REALTIME_QUERY_PREFIXES = [
  STORE_SETTING_QUERY_KEYS.FREE_DELIVERY,
  STORE_SETTING_QUERY_KEYS.SELLER_DETAILS,
  DELIVERY_METHOD_QUERY_KEYS.ALL,
] as const satisfies readonly QueryKey[]
