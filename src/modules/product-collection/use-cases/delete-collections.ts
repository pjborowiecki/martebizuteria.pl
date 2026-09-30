import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleCollectionCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordCatalogCollectionDeletedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { countProductsForCollections } from "~/src/modules/collection-on-product/collection-on-product.accessors"
import { COLLECTION_ERROR_CODES, COLLECTION_MUTATION_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { deleteCollections as productCollectionDeleteCollections } from "~/src/modules/product-collection/product-collection.server"
import { productCollectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

export const deleteCollections = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["delete"] })])
  .validator((input: zod.input<typeof productCollectionZodSchemas.deleteInput>) => productCollectionZodSchemas.deleteInput.parse(input))
  .handler(async ({ data: ids }) => {
    const productCount = await countProductsForCollections(ids)
    if (productCount > 0) {
      throw new AppError(ERROR_CODES.CONFLICT, COLLECTION_ERROR_CODES.HAS_PRODUCTS)
    }
    await productCollectionDeleteCollections(ids)
    scheduleCollectionCatalogInvalidation()
    recordCatalogCollectionDeletedAudit(ids.join(", "))

    return { deleted: ids.length, ok: true }
  })

export const deleteCollectionsMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof deleteCollections>[0]["data"]) => deleteCollections({ data }),
  mutationKey: COLLECTION_MUTATION_KEYS.DELETE,
})
