import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { setCollectionRanks } from "~/src/modules/product-collection/product-collection.server"
import { collectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

import { scheduleCollectionCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const reorderCollectionsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => collectionZodSchemas.reorderInput.parse(data))
  .handler(async ({ data: orderedIds }) => {
    await assertAdmin()
    const updates = orderedIds.map((id, index) => ({ id, rank: index }))
    await setCollectionRanks(updates)
    scheduleCollectionCatalogInvalidation()
    return { ok: true }
  })
