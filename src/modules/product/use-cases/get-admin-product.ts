import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getProductByHandleQuery } from "~/src/modules/product/product.accessors"
import { PRODUCT_QUERY_KEYS, PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"
import { productZodSchemas } from "~/src/modules/product/product.zod"

export const getAdminProduct = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .validator((input: zod.input<typeof productZodSchemas.handleInput>) => productZodSchemas.handleInput.parse(input))
  .handler(({ data: handle }) => getProductByHandleQuery.execute({ handle }))

export const getAdminProductQuery = (handle: string) =>
  queryOptions({
    enabled: handle !== "" && handle !== "new",
    queryFn: async () => {
      const detail = await getAdminProduct({ data: handle })

      if (detail === undefined) {
        throw notFound()
      }

      return detail
    },
    queryKey: [...PRODUCT_QUERY_KEYS.ADMIN.BY_HANDLE, handle],
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: PRODUCT_QUERY_STALE_MS,
  })
