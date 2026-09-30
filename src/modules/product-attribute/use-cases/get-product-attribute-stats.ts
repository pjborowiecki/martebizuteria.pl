import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { PRODUCT_ATTRIBUTE_QUERY_KEYS, PRODUCT_ATTRIBUTE_QUERY_STALE_MS } from "~/src/modules/product-attribute/product-attribute.constants"
import { getAdminProductAttributeListItems } from "~/src/modules/product-attribute/product-attribute.server"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { computeProductAttributeStats } from "~/src/modules/product-attribute/product-attribute.utils"

export const getProductAttributeStats = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .handler(async (): Promise<ProductAttribute["stats"]> => {
    const items = await getAdminProductAttributeListItems()

    return computeProductAttributeStats(items)
  })

export const getProductAttributeStatsQuery = () =>
  queryOptions({
    queryFn: () => getProductAttributeStats(),
    queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: PRODUCT_ATTRIBUTE_QUERY_STALE_MS,
  })
