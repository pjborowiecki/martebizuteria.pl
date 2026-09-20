import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getProductByHandleQuery } from "~/src/modules/product/product.accessors"
import { PRODUCT_QUERY_KEYS, PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"

export const fetchAdminProductByHandleFn = createServerFn({ method: "GET" })
  .validator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    await assertAdmin()
    return getProductByHandleQuery.execute({ handle })
  })

export const adminProductByHandleQueryOptions = (handle: string) =>
  queryOptions({
    enabled: handle !== "" && handle !== "new",
    queryFn: () => fetchAdminProductByHandleFn({ data: handle }),
    queryKey: [...PRODUCT_QUERY_KEYS.ADMIN.BY_HANDLE, handle] as const,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: PRODUCT_QUERY_STALE_MS,
  })
