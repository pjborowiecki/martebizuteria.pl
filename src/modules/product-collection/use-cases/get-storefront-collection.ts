import { createServerFn } from "@tanstack/react-start"

import { getStorefrontCollectionByHandleQuery } from "~/src/modules/product-collection/product-collection.server"

export const fetchStorefrontCollectionMetaFn = createServerFn({ method: "GET" })
  .validator((handle: string) => handle)
  .handler(({ data: handle }) => getStorefrontCollectionByHandleQuery.execute({ handle }))
