import { scheduleRealtimeInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server"

import { ADMIN_DASHBOARD_QUERY_KEYS } from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"
import { CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { CONTENT_PAGE_QUERY_KEYS } from "~/src/modules/content-page/content-page.constants"
import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { NEWSLETTER_QUERY_KEYS } from "~/src/modules/newsletter/newsletter.constants"
import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import { CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"
import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

export const scheduleProductCatalogInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [PRODUCT_QUERY_KEYS.ADMIN.ALL, PRODUCT_QUERY_KEYS.ADMIN.STATS],
    storefront: [
      PRODUCT_QUERY_KEYS.ALL,
      PRODUCT_QUERY_KEYS.BY_HANDLE,
      PRODUCT_QUERY_KEYS.LANDING_NEW_ARRIVALS,
      PRODUCT_QUERY_KEYS.RELATED_BY_CATEGORY,
      PRODUCT_QUERY_KEYS.STOREFRONT_PAGE,
      CART_QUERY_KEYS.AVAILABILITY,
    ],
  })
}

export const scheduleCategoryCatalogInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [CATEGORY_QUERY_KEYS.ADMIN.ALL, CATEGORY_QUERY_KEYS.ADMIN.STATS],
    storefront: [CATEGORY_QUERY_KEYS.ALL, CATEGORY_QUERY_KEYS.BY_HANDLE],
  })
}

export const scheduleCollectionCatalogInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [COLLECTION_QUERY_KEYS.ADMIN.ALL, COLLECTION_QUERY_KEYS.ADMIN.STATS],
    storefront: [
      COLLECTION_QUERY_KEYS.ALL,
      COLLECTION_QUERY_KEYS.BY_HANDLE,
      PRODUCT_QUERY_KEYS.LANDING_NEW_ARRIVALS,
      PRODUCT_QUERY_KEYS.STOREFRONT_PAGE,
    ],
  })
}

export const scheduleContentPageInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [CONTENT_PAGE_QUERY_KEYS.ADMIN.ALL, CONTENT_PAGE_QUERY_KEYS.ADMIN.BY_HANDLE],
    storefront: [CONTENT_PAGE_QUERY_KEYS.BY_HANDLE],
  })
}

export const scheduleProductAttributeCatalogInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL, PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.STATS],
  })
}

export const scheduleAdminCustomersInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [USER_QUERY_KEYS.ADMIN.CUSTOMERS, USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE],
  })
}

export const scheduleAdminNewsletterSubscribersInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [NEWSLETTER_QUERY_KEYS.ADMIN.PAGE, NEWSLETTER_QUERY_KEYS.ADMIN.STATS],
  })
}

export const scheduleAdminAuditLogInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS],
  })
}

export const ORDER_CHANGE_ADMIN_QUERY_KEYS = [ORDER_QUERY_KEYS.ADMIN.ORDERS, ADMIN_DASHBOARD_QUERY_KEYS.ALL] as const

export const scheduleAdminOrdersInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: ORDER_CHANGE_ADMIN_QUERY_KEYS,
  })
}

export const scheduleDeliveryMethodsInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [DELIVERY_METHOD_QUERY_KEYS.ADMIN.ALL],
    storefront: [DELIVERY_METHOD_QUERY_KEYS.ALL],
  })
}

export const scheduleFreeDeliveryInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [STORE_SETTING_QUERY_KEYS.ADMIN.FREE_DELIVERY],
    storefront: [STORE_SETTING_QUERY_KEYS.FREE_DELIVERY],
  })
}

export const scheduleSalesStatusInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [STORE_SETTING_QUERY_KEYS.ADMIN.SALES],
    storefront: [STORE_SETTING_QUERY_KEYS.SALES],
  })
}

export const scheduleSellerDetailsInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [STORE_SETTING_QUERY_KEYS.ADMIN.SELLER_DETAILS],
    storefront: [STORE_SETTING_QUERY_KEYS.SELLER_DETAILS],
  })
}
