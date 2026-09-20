import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"
import type { z } from "zod/v4"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { replaceAttributesForProduct } from "~/src/modules/attribute-on-product/attribute-on-product.utils"
import { recordCatalogProductCreatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { replaceProductImages } from "~/src/modules/product-image/product-image.persist.utils"
import { deleteProducts } from "~/src/modules/product/product.accessors"
import { deleteOrphanProductByHandle, insertProductWithCatalog } from "~/src/modules/product/product.catalog.server"
import { rethrowProductMutationError } from "~/src/modules/product/product.mutation-errors"
import { productZodSchemas } from "~/src/modules/product/product.zod"

import { scheduleProductCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"
import { tryCatch } from "~/src/lib/try-catch"
const persistCreatedProductDetails = async (
  productId: string,
  data: z.infer<(typeof productZodSchemas)["createCompleteInput"]>,
): Promise<void> => {
  await replaceProductImages(productId, data.images)
  await replaceAttributesForProduct(productId, data.attributeValues)
}
const createProductAttempt = async (
  data: z.infer<(typeof productZodSchemas)["createCompleteInput"]>,
  allowRetry: boolean,
): Promise<{
  handle: string
  id: string
}> => {
  const id = uuidv7()
  try {
    await insertProductWithCatalog(data, id)
    await persistCreatedProductDetails(id, data)
    return {
      handle: data.handle,
      id,
    }
  } catch (error) {
    await tryCatch(deleteProducts([id]))
    if (allowRetry && (await deleteOrphanProductByHandle(data.handle))) {
      return createProductAttempt(data, false)
    }
    return rethrowProductMutationError(error)
  }
}
const createProductRecord = async (
  data: z.infer<(typeof productZodSchemas)["createCompleteInput"]>,
): Promise<{
  handle: string
  id: string
}> => {
  await deleteOrphanProductByHandle(data.handle)
  return createProductAttempt(data, true)
}
export const createProductCompleteFn = createServerFn({
  method: "POST",
})
  .validator((data: unknown) => productZodSchemas.createCompleteInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()
    const result = await createProductRecord(data)
    scheduleProductCatalogInvalidation()
    recordCatalogProductCreatedAudit(result.handle, {
      resourceId: result.id,
    })
    return result
  })
