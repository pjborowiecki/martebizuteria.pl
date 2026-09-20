import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { recordCatalogProductDeletedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { deleteProducts } from "~/src/modules/product/product.accessors"
import { productZodSchemas } from "~/src/modules/product/product.zod"

import { scheduleProductCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const deleteProductsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => productZodSchemas.deleteInput.parse(data))
  .handler(async ({ data: ids }) => {
    await assertAdmin()

    await deleteProducts(ids)

    scheduleProductCatalogInvalidation()
    recordCatalogProductDeletedAudit(ids.join(", "))

    return { deleted: ids.length, ok: true }
  })
