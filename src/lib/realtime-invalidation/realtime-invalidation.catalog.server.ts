import { CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import { CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"
import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { scheduleRealtimeInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.publish.server"
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
    storefront: [COLLECTION_QUERY_KEYS.ALL, COLLECTION_QUERY_KEYS.BY_HANDLE, PRODUCT_QUERY_KEYS.LANDING_NEW_ARRIVALS],
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
export const scheduleAdminOrdersInvalidation = (): void => {
  scheduleRealtimeInvalidation({
    admin: [ORDER_QUERY_KEYS.ADMIN.ORDERS],
  })
}
