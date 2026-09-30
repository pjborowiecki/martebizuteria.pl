import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { PRODUCT_MUTATION_KEYS } from "~/src/modules/product/product.constants"
import { setProductRanks } from "~/src/modules/product/product.mutations"
import { productZodSchemas } from "~/src/modules/product/product.zod"

export const reorderProducts = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["update"] })])
  .validator((input: zod.input<typeof productZodSchemas.reorderInput>) => productZodSchemas.reorderInput.parse(input))
  .handler(async ({ data: orderedIds }) => {
    const updates = orderedIds.map((id, index) => ({ id, rank: index }))
    await setProductRanks(updates)

    scheduleProductCatalogInvalidation()

    return { ok: true }
  })

export const reorderProductsMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof reorderProducts>[0]["data"]) => reorderProducts({ data }),
  mutationKey: PRODUCT_MUTATION_KEYS.REORDER,
})
