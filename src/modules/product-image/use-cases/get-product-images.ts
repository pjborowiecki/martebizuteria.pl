import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { PRODUCT_IMAGE_QUERY_KEYS } from "~/src/modules/product-image/product-image.constants"
import { getProductImagesQuery } from "~/src/modules/product-image/product-image.server"
import { PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"

export const fetchProductImagesFn = createServerFn({ method: "GET" })
  .validator((productId: string) => productId)
  .handler(async ({ data: productId }) => {
    await assertAdmin()
    return getProductImagesQuery.execute({ productId })
  })

export const byProductId = (productId: string) =>
  queryOptions({
    enabled: productId !== "",
    queryFn: () => fetchProductImagesFn({ data: productId }),
    queryKey: [...PRODUCT_IMAGE_QUERY_KEYS.BY_PRODUCT_ID, productId] as const,
    staleTime: PRODUCT_QUERY_STALE_MS,
  })
