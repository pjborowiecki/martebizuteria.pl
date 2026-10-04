import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { CATEGORY_QUERY_KEYS, CATEGORY_QUERY_STALE_MS } from "~/src/modules/product-category/product-category.constants"
import { getStorefrontCategoryByHandleQuery } from "~/src/modules/product-category/product-category.server"
import { productCategoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

export const getStorefrontCategory = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof productCategoryZodSchemas.handleInput>) => productCategoryZodSchemas.handleInput.parse(input))
  .handler(async ({ data: handle }) => {
    const category = await getStorefrontCategoryByHandleQuery.execute({ handle })

    if (category === undefined) {
      return false
    }

    return category
  })

export const getStorefrontCategoryQuery = (handle: string) =>
  queryOptions({
    queryFn: () => getStorefrontCategory({ data: handle }),
    queryKey: [...CATEGORY_QUERY_KEYS.BY_HANDLE, handle],
    staleTime: CATEGORY_QUERY_STALE_MS,
  })
