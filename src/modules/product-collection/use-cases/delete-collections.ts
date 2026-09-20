import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { recordCatalogCollectionDeletedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { countProductsForCollections } from "~/src/modules/collection-on-product/collection-on-product.accessors"
import { COLLECTION_ERROR_CODES } from "~/src/modules/product-collection/product-collection.constants"
import { deleteCollections } from "~/src/modules/product-collection/product-collection.server"
import { collectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

import { scheduleCollectionCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const deleteCollectionsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => collectionZodSchemas.deleteInput.parse(data))
  .handler(async ({ data: ids }) => {
    await assertAdmin()
    const productCount = await countProductsForCollections(ids)
    if (productCount > 0) {
      throw new Error(COLLECTION_ERROR_CODES.HAS_PRODUCTS)
    }
    await deleteCollections(ids)
    scheduleCollectionCatalogInvalidation()
    recordCatalogCollectionDeletedAudit(ids.join(", "))
    return { deleted: ids.length, ok: true }
  })
