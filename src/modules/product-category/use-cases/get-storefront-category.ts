import { createServerFn } from "@tanstack/react-start"

import { getStorefrontCategoryByHandleQuery } from "~/src/modules/product-category/product-category.server"

export const fetchStorefrontCategoryMetaFn = createServerFn({ method: "GET" })
  .validator((handle: string) => handle)
  .handler(({ data: handle }) => getStorefrontCategoryByHandleQuery.execute({ handle }))
