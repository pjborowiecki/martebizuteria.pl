import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { COLLECTION_QUERY_KEYS, COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { getStorefrontCollectionByHandleQuery } from "~/src/modules/product-collection/product-collection.server"
import { getPublishedProductsByCollectionId } from "~/src/modules/product/product.accessors"
import { PRODUCT_STOREFRONT_LIST_LIMIT } from "~/src/modules/product/product.constants"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/lib/list-pagination"

interface CollectionByHandleInput {
  readonly handle: string
  readonly page?: number
}

export const fetchCollectionByHandleFn = createServerFn({ method: "GET" })
  .validator((input: CollectionByHandleInput) => input)
  .handler(async ({ data: { handle, page = LIST_PAGE_FIRST } }) => {
    const coll = await getStorefrontCollectionByHandleQuery.execute({ handle })
    if (coll === undefined) {
      return false
    }
    const listParams = listPaginationParamsFromPage(page, PRODUCT_STOREFRONT_LIST_LIMIT)
    const { items, total } = await getPublishedProductsByCollectionId(coll.id, listParams)
    return { ...coll, products: buildListPaginationResult(items, total, listParams) }
  })

export const collectionQueryOptions = (handle: string, page = LIST_PAGE_FIRST) =>
  queryOptions({
    queryFn: () => fetchCollectionByHandleFn({ data: { handle, page } }),
    queryKey: [...COLLECTION_QUERY_KEYS.BY_HANDLE, handle, page] as const,
    staleTime: COLLECTION_QUERY_STALE_MS,
  })
