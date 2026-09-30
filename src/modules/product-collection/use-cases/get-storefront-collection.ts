import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { getStorefrontCollectionByHandleQuery } from "~/src/modules/product-collection/product-collection.server"
import { productCollectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

export const getStorefrontCollection = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof productCollectionZodSchemas.handleInput>) => productCollectionZodSchemas.handleInput.parse(input))
  .handler(({ data: handle }) => getStorefrontCollectionByHandleQuery.execute({ handle }))
