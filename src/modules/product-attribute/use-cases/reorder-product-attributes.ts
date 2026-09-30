import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleProductAttributeCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { PRODUCT_ATTRIBUTE_MUTATION_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import { setProductAttributeRanks } from "~/src/modules/product-attribute/product-attribute.server"
import { productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod"

export const reorderProductAttributes = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["update"] })])
  .validator((input: zod.input<typeof productAttributeZodSchemas.reorderInput>) => productAttributeZodSchemas.reorderInput.parse(input))
  .handler(async ({ data: orderedIds }) => {
    const updates = orderedIds.map((id, rank) => ({ id, rank }))
    await setProductAttributeRanks(updates)
    scheduleProductAttributeCatalogInvalidation()

    return { ok: true }
  })

export const reorderProductAttributesMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof reorderProductAttributes>[0]["data"]) => reorderProductAttributes({ data }),
  mutationKey: PRODUCT_ATTRIBUTE_MUTATION_KEYS.REORDER,
})
