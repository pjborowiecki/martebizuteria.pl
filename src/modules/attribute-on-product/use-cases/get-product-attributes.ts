import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import {
  ATTRIBUTE_ON_PRODUCT_QUERY_KEYS,
  ATTRIBUTE_ON_PRODUCT_QUERY_STALE_MS,
} from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { getByProductIdQuery } from "~/src/modules/attribute-on-product/attribute-on-product.server"
import { attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod"

export const getProductAttributes = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .validator((input: zod.input<typeof attributeOnProductZodSchemas.productIdInput>) =>
    attributeOnProductZodSchemas.productIdInput.parse(input),
  )
  .handler(({ data: productId }) => getByProductIdQuery.execute({ productId }))

export const getProductAttributesQuery = (productId: string) =>
  queryOptions({
    enabled: productId !== "",
    queryFn: () => getProductAttributes({ data: productId }),
    queryKey: [...ATTRIBUTE_ON_PRODUCT_QUERY_KEYS.BY_PRODUCT_ID, productId],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ATTRIBUTE_ON_PRODUCT_QUERY_STALE_MS,
  })
