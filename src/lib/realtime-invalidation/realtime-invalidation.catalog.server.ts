import { CONSTANTS } from "~/src/constants";

import { scheduleRealtimeInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.publish.server";

export function scheduleProductCatalogInvalidation(): void {
  scheduleRealtimeInvalidation({
    admin: [CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.ALL, CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.STATS],
    storefront: [
      CONSTANTS.QUERY_KEYS.PRODUCT.ALL,
      CONSTANTS.QUERY_KEYS.PRODUCT.BY_HANDLE,
      CONSTANTS.QUERY_KEYS.PRODUCT.RELATED_BY_CATEGORY,
      CONSTANTS.QUERY_KEYS.CART.AVAILABILITY
    ]
  });
}

export function scheduleCategoryCatalogInvalidation(): void {
  scheduleRealtimeInvalidation({
    admin: [CONSTANTS.QUERY_KEYS.CATEGORY.ADMIN.ALL, CONSTANTS.QUERY_KEYS.CATEGORY.ADMIN.STATS],
    storefront: [CONSTANTS.QUERY_KEYS.CATEGORY.ALL, CONSTANTS.QUERY_KEYS.CATEGORY.BY_HANDLE]
  });
}

export function scheduleCollectionCatalogInvalidation(): void {
  scheduleRealtimeInvalidation({
    admin: [CONSTANTS.QUERY_KEYS.COLLECTION.ADMIN.ALL, CONSTANTS.QUERY_KEYS.COLLECTION.ADMIN.STATS],
    storefront: [CONSTANTS.QUERY_KEYS.COLLECTION.ALL, CONSTANTS.QUERY_KEYS.COLLECTION.BY_HANDLE]
  });
}

export function scheduleProductAttributeCatalogInvalidation(): void {
  scheduleRealtimeInvalidation({
    admin: [CONSTANTS.QUERY_KEYS.PRODUCT_ATTRIBUTE.ADMIN.ALL, CONSTANTS.QUERY_KEYS.PRODUCT_ATTRIBUTE.ADMIN.STATS]
  });
}

export function scheduleAdminCustomersInvalidation(): void {
  scheduleRealtimeInvalidation({
    admin: [CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMERS, CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMERS_PAGE]
  });
}

export function scheduleAdminOrdersInvalidation(): void {
  scheduleRealtimeInvalidation({
    admin: [CONSTANTS.QUERY_KEYS.ORDER.ADMIN.ORDERS]
  });
}
