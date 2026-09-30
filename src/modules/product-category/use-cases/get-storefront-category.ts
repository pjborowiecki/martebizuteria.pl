import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { getStorefrontCategoryByHandleQuery } from "~/src/modules/product-category/product-category.server"
import { productCategoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

export const getStorefrontCategory = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof productCategoryZodSchemas.handleInput>) => productCategoryZodSchemas.handleInput.parse(input))
  .handler(({ data: handle }) => getStorefrontCategoryByHandleQuery.execute({ handle }))
