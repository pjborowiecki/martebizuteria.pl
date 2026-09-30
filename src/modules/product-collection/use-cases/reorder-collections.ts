import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleCollectionCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { COLLECTION_MUTATION_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { setCollectionRanks } from "~/src/modules/product-collection/product-collection.server"
import { productCollectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

export const reorderCollections = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["update"] })])
  .validator((input: zod.input<typeof productCollectionZodSchemas.reorderInput>) => productCollectionZodSchemas.reorderInput.parse(input))
  .handler(async ({ data: orderedIds }) => {
    const updates = orderedIds.map((id, index) => ({ id, rank: index }))
    await setCollectionRanks(updates)
    scheduleCollectionCatalogInvalidation()

    return { ok: true }
  })

export const reorderCollectionsMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof reorderCollections>[0]["data"]) => reorderCollections({ data }),
  mutationKey: COLLECTION_MUTATION_KEYS.REORDER,
})
