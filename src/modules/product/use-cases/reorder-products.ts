import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { setProductRanks } from "~/src/modules/product/product.accessors"
import { productZodSchemas } from "~/src/modules/product/product.zod"

import { scheduleProductCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const reorderProductsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => productZodSchemas.reorderInput.parse(data))
  .handler(async ({ data: orderedIds }) => {
    await assertAdmin()

    const updates = orderedIds.map((id, index) => ({ id, rank: index }))
    await setProductRanks(updates)

    scheduleProductCatalogInvalidation()

    return { ok: true }
  })
