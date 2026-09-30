import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { PRODUCT_IMAGE_QUERY_KEYS } from "~/src/modules/product-image/product-image.constants"
import { getProductImagesQuery as productImageGetProductImagesQuery } from "~/src/modules/product-image/product-image.server"
import { productImageZodSchemas } from "~/src/modules/product-image/product-image.zod"
import { PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"

export const getProductImages = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .validator((input: zod.input<typeof productImageZodSchemas.productIdInput>) => productImageZodSchemas.productIdInput.parse(input))
  .handler(({ data: productId }) => productImageGetProductImagesQuery.execute({ productId }))

export const getProductImagesQuery = (productId: string) =>
  queryOptions({
    enabled: productId !== "",
    queryFn: () => getProductImages({ data: productId }),
    queryKey: [...PRODUCT_IMAGE_QUERY_KEYS.BY_PRODUCT_ID, productId],
    staleTime: PRODUCT_QUERY_STALE_MS,
  })
