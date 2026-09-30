import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { PRODUCT_ATTRIBUTE_QUERY_KEYS, PRODUCT_ATTRIBUTE_QUERY_STALE_MS } from "~/src/modules/product-attribute/product-attribute.constants"
import { getAdminProductAttributeListItems } from "~/src/modules/product-attribute/product-attribute.server"

export const getAdminProductAttributes = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .handler(() => getAdminProductAttributeListItems())

export const getAdminProductAttributesQuery = () =>
  queryOptions({
    queryFn: () => getAdminProductAttributes(),
    queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: PRODUCT_ATTRIBUTE_QUERY_STALE_MS,
  })
