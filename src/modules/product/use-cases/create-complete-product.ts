import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { replaceAttributesForProduct } from "~/src/modules/attribute-on-product/attribute-on-product.utils"
import { recordCatalogProductCreatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { replaceProductImages } from "~/src/modules/product-image/product-image.persist.utils"
import { deleteOrphanProductByHandle, insertProductWithCatalog } from "~/src/modules/product/product.catalog.server"
import { rethrowProductMutationError } from "~/src/modules/product/product.mutation-errors"
import { deleteProducts } from "~/src/modules/product/product.mutations"
import { productZodSchemas } from "~/src/modules/product/product.zod"

const persistProduct = async (productId: string, data: zod.infer<(typeof productZodSchemas)["createCompleteInput"]>): Promise<void> => {
  await insertProductWithCatalog(data, productId)
  await replaceProductImages(productId, data.images)
  await replaceAttributesForProduct(productId, data.attributeValues)
}

export const createCompleteProduct = createServerFn({
  method: "POST",
})
  .middleware([authorized({ product: ["create"] })])
  .validator((input: zod.input<typeof productZodSchemas.createCompleteInput>) => productZodSchemas.createCompleteInput.parse(input))
  .handler(async ({ data }) => {
    await deleteOrphanProductByHandle(data.handle)

    const id = uuidv7()

    try {
      await persistProduct(id, data)
    } catch (error) {
      await deleteProducts([id]).catch((cleanupError: unknown) => {
        console.error(`Failed to roll back partially created product ${id}:`, cleanupError)
      })

      return rethrowProductMutationError(error)
    }
    scheduleProductCatalogInvalidation()
    recordCatalogProductCreatedAudit(data.handle, {
      resourceId: id,
    })

    return {
      handle: data.handle,
      id,
    }
  })
