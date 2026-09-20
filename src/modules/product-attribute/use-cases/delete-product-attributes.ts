import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { countForAttributeIds } from "~/src/modules/attribute-on-product/attribute-on-product.server"
import { recordCatalogAttributeDeletedAudit, resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.events.server"
import { resolveRequestAuditIp } from "~/src/modules/audit-log/audit-log.record.server"
import { PRODUCT_ATTRIBUTE_ERROR_CODES } from "~/src/modules/product-attribute/product-attribute.constants"
import { deleteProductAttributes, getProductAttributesByIds } from "~/src/modules/product-attribute/product-attribute.server"
import { productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod"

import { scheduleProductAttributeCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const deleteProductAttributesFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => productAttributeZodSchemas.deleteInput.parse(data))
  .handler(async ({ data: ids }) => {
    const adminUser = await assertAdmin()
    const auditActor = resolveAuthAuditActor(adminUser)
    const auditIp = resolveRequestAuditIp()
    const usageCount = await countForAttributeIds(ids)
    if (usageCount > 0) {
      throw new Error(PRODUCT_ATTRIBUTE_ERROR_CODES.IN_USE)
    }
    const attributes = await getProductAttributesByIds(ids)
    await deleteProductAttributes(ids)
    scheduleProductAttributeCatalogInvalidation()
    for (const attribute of attributes) {
      recordCatalogAttributeDeletedAudit(attribute.handle, {
        actor: auditActor,
        ip: auditIp,
        metadata: { handle: attribute.handle },
        resourceId: attribute.id,
      })
    }
    return { deleted: ids.length, ok: true }
  })
