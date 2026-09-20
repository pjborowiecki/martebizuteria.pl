import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { recordCatalogProductUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { buildProductAuditChange, extractProductAuditSnapshot } from "~/src/modules/product/product-audit.utils"
import { getAdminProductDetailByIdQuery, getProductByHandleQuery } from "~/src/modules/product/product.accessors"
import { updateProductWithCatalog } from "~/src/modules/product/product.catalog.server"
import { PRODUCT_ERROR_CODES } from "~/src/modules/product/product.constants"
import { rethrowProductMutationError } from "~/src/modules/product/product.mutation-errors"
import { productZodSchemas } from "~/src/modules/product/product.zod"

import { scheduleProductCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const updateProductFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => productZodSchemas.update.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()

    const { id, ...catalogInput } = data

    const existing = await getProductByHandleQuery.execute({ handle: catalogInput.handle })
    if (existing !== undefined && existing.id !== id) {
      throw new Error(PRODUCT_ERROR_CODES.DUPLICATE_HANDLE)
    }

    const beforeProduct = await getAdminProductDetailByIdQuery.execute({ id })
    const beforeSnapshot = beforeProduct === undefined ? undefined : extractProductAuditSnapshot(beforeProduct)

    await updateProductWithCatalog(id, catalogInput).catch(rethrowProductMutationError)

    const afterProduct = await getAdminProductDetailByIdQuery.execute({ id })
    const auditChange = afterProduct === undefined ? {} : buildProductAuditChange(beforeSnapshot, extractProductAuditSnapshot(afterProduct))

    scheduleProductCatalogInvalidation()
    recordCatalogProductUpdatedAudit(catalogInput.handle, {
      detail: auditChange.detail,
      metadata: auditChange.metadata,
      resourceId: id,
    })

    return { handle: catalogInput.handle, id }
  })
