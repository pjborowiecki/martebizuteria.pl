import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { getPublishedProductsInStock } from "~/src/modules/product/product.accessors"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"

export const fetchProductsFn = createServerFn({ method: "GET" }).handler(() => getPublishedProductsInStock())

export const productsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchProductsFn(),
    queryKey: PRODUCT_QUERY_KEYS.ALL,
  })
