import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { PRODUCT_ATTRIBUTE_QUERY_KEYS, PRODUCT_ATTRIBUTE_QUERY_STALE_MS } from "~/src/modules/product-attribute/product-attribute.constants"
import { getAdminProductAttributeListItems } from "~/src/modules/product-attribute/product-attribute.server"

export const fetchAdminProductAttributesFn = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin()
  return getAdminProductAttributeListItems()
})

export const adminProductAttributesQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchAdminProductAttributesFn(),
    queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: PRODUCT_ATTRIBUTE_QUERY_STALE_MS,
  })
