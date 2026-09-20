import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { ATTRIBUTE_ON_PRODUCT_QUERY_KEYS } from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { getByProductIdQuery } from "~/src/modules/attribute-on-product/attribute-on-product.server"

const ATTRIBUTE_ON_PRODUCT_QUERY_STALE_MS = 60_000

export const fetchByProductIdFn = createServerFn({ method: "GET" })
  .validator((productId: string) => productId)
  .handler(async ({ data: productId }) => {
    await assertAdmin()
    return getByProductIdQuery.execute({ productId })
  })

export const byProductId = (productId: string) =>
  queryOptions({
    enabled: productId !== "",
    queryFn: () => fetchByProductIdFn({ data: productId }),
    queryKey: [...ATTRIBUTE_ON_PRODUCT_QUERY_KEYS.BY_PRODUCT_ID, productId] as const,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ATTRIBUTE_ON_PRODUCT_QUERY_STALE_MS,
  })
