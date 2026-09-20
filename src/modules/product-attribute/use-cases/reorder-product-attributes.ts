import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { setProductAttributeRanks } from "~/src/modules/product-attribute/product-attribute.server"
import { productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod"

import { scheduleProductAttributeCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const reorderProductAttributesFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => productAttributeZodSchemas.reorderInput.parse(data))
  .handler(async ({ data: orderedIds }) => {
    await assertAdmin()
    const updates = orderedIds.map((id, rank) => ({ id, rank }))
    await setProductAttributeRanks(updates)
    scheduleProductAttributeCatalogInvalidation()
    return { ok: true }
  })
