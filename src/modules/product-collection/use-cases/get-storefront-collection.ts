import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { getStorefrontCollectionByHandleQuery } from "~/src/modules/product-collection/product-collection.server"
import { productCollectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

export const getStorefrontCollection = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof productCollectionZodSchemas.handleInput>) => productCollectionZodSchemas.handleInput.parse(input))
  .handler(async ({ data: handle }) => {
    const collection = await getStorefrontCollectionByHandleQuery.execute({ handle })

    if (collection === undefined) {
      return false
    }

    return collection
  })

export const getStorefrontCollectionQuery = (handle: string) =>
  queryOptions({
    queryFn: () => getStorefrontCollection({ data: handle }),
    queryKey: [...COLLECTION_QUERY_KEYS.BY_HANDLE, handle],
    staleTime: COLLECTION_QUERY_STALE_MS,
  })
