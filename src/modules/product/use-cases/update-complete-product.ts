import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleProductCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { replaceAllAttributesForProduct } from "~/src/modules/attribute-on-product/attribute-on-product.utils"
import { recordCatalogProductUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { replaceProductImages } from "~/src/modules/product-image/product-image.persist.utils"
import { buildProductAuditChange, extractProductAuditSnapshot } from "~/src/modules/product/product-audit.utils"
import { getAdminProductDetailByIdQuery, getProductByHandleQuery } from "~/src/modules/product/product.accessors"
import { assertCatalogSkusAvailable, updateProductWithCatalog } from "~/src/modules/product/product.catalog.server"
import { PRODUCT_ERROR_CODES } from "~/src/modules/product/product.constants"
import { rethrowProductMutationError } from "~/src/modules/product/product.mutation-errors"
import { productZodSchemas } from "~/src/modules/product/product.zod"

const updateProductRecord = async (
  data: zod.infer<(typeof productZodSchemas)["updateCompleteInput"]>,
): Promise<{
  handle: string
  id: string
}> => {
  const { attributeValues, id, images, variantAttributeValues, ...catalogInput } = data
  const existing = await getProductByHandleQuery.execute({
    handle: catalogInput.handle,
  })

  if (existing !== undefined && existing.id !== id) {
    throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ERROR_CODES.DUPLICATE_HANDLE)
  }

  const beforeProduct = await getAdminProductDetailByIdQuery.execute({
    id,
  })

  const beforeSnapshot = beforeProduct === undefined ? undefined : extractProductAuditSnapshot(beforeProduct)
  await assertCatalogSkusAvailable(catalogInput, id)
  await updateProductWithCatalog(id, catalogInput)
  await replaceProductImages(id, images)
  await replaceAllAttributesForProduct(
    id,
    attributeValues,
    variantAttributeValues.map((group) => ({
      rows: group.values,
      variantId: group.variantId,
    })),
  )

  const afterProduct = await getAdminProductDetailByIdQuery.execute({
    id,
  })

  const auditChange = afterProduct === undefined ? {} : buildProductAuditChange(beforeSnapshot, extractProductAuditSnapshot(afterProduct))
  scheduleProductCatalogInvalidation()
  recordCatalogProductUpdatedAudit(catalogInput.handle, {
    detail: auditChange.detail,
    metadata: auditChange.metadata,
    resourceId: id,
  })

  return {
    handle: catalogInput.handle,
    id,
  }
}

export const updateCompleteProduct = createServerFn({
  method: "POST",
})
  .middleware([authorized({ product: ["update"] })])
  .validator((input: zod.input<typeof productZodSchemas.updateCompleteInput>) => productZodSchemas.updateCompleteInput.parse(input))
  .handler(({ data }) => updateProductRecord(data).catch(rethrowProductMutationError))
