import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { loadAttributeOnProductRows, prepareAttributeOnProductBatch } from "~/src/modules/attribute-on-product/attribute-on-product.utils"
import { recordCatalogProductCreatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { prepareProductImagesBatch } from "~/src/modules/product-image/product-image.persist.utils"
import {
  assertCatalogSkusAvailable,
  deleteOrphanProductByHandle,
  getNextProductRank,
  prepareProductInsertBatch,
} from "~/src/modules/product/product.catalog.server"
import { rethrowProductMutationError } from "~/src/modules/product/product.mutation-errors"
import { productZodSchemas } from "~/src/modules/product/product.zod"

const persistProduct = async (productId: string, data: zod.infer<(typeof productZodSchemas)["createCompleteInput"]>): Promise<void> => {
  const [rank, attributeRows] = await Promise.all([
    getNextProductRank(),
    loadAttributeOnProductRows(productId, data.attributeValues),
    assertCatalogSkusAvailable(data),
  ])
  await runDrizzleBatch([
    ...prepareProductInsertBatch(productId, data, rank),
    ...prepareProductImagesBatch(productId, data.images),
    ...prepareAttributeOnProductBatch(productId, attributeRows),
  ])
}

export const createCompleteProduct = createServerFn({
  method: "POST",
})
  .middleware([authorized({ product: ["create"] })])
  .validator((input: zod.input<typeof productZodSchemas.createCompleteInput>) => productZodSchemas.createCompleteInput.parse(input))
  .handler(async ({ data }) => {
    await deleteOrphanProductByHandle(data.handle)

    const id = uuidv7()
    await persistProduct(id, data).catch(rethrowProductMutationError)
    scheduleProductCatalogInvalidation()
    recordCatalogProductCreatedAudit(data.handle, {
      resourceId: id,
    })

    return {
      handle: data.handle,
      id,
    }
  })
