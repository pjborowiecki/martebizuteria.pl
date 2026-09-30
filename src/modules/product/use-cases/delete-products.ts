import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { recordCatalogProductDeletedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { PRODUCT_MUTATION_KEYS } from "~/src/modules/product/product.constants"
import { deleteProducts as productDeleteProducts } from "~/src/modules/product/product.mutations"
import { productZodSchemas } from "~/src/modules/product/product.zod"

export const deleteProducts = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["delete"] })])
  .validator((input: zod.input<typeof productZodSchemas.deleteInput>) => productZodSchemas.deleteInput.parse(input))
  .handler(async ({ data: ids }) => {
    await productDeleteProducts(ids)

    scheduleProductCatalogInvalidation()
    recordCatalogProductDeletedAudit(ids.join(", "))

    return { deleted: ids.length, ok: true }
  })

export const deleteProductsMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof deleteProducts>[0]["data"]) => deleteProducts({ data }),
  mutationKey: PRODUCT_MUTATION_KEYS.DELETE,
})
