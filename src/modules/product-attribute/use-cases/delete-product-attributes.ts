import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleProductAttributeCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { countForAttributeIds } from "~/src/modules/attribute-on-product/attribute-on-product.server"
import { recordCatalogAttributeDeletedAudit, resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.events.server"
import { resolveRequestAuditIp } from "~/src/modules/audit-log/audit-log.record.server"
import { PRODUCT_ATTRIBUTE_ERROR_CODES, PRODUCT_ATTRIBUTE_MUTATION_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import {
  getProductAttributesByIds,
  deleteProductAttributes as productAttributeDeleteProductAttributes,
} from "~/src/modules/product-attribute/product-attribute.server"
import { productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod"

export const deleteProductAttributes = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["delete"] })])
  .validator((input: zod.input<typeof productAttributeZodSchemas.deleteInput>) => productAttributeZodSchemas.deleteInput.parse(input))
  .handler(async ({ context, data: ids }) => {
    const auditActor = resolveAuthAuditActor(context.auth.user)
    const auditIp = resolveRequestAuditIp()
    const usageCount = await countForAttributeIds(ids)
    if (usageCount > 0) {
      throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ATTRIBUTE_ERROR_CODES.IN_USE)
    }

    const attributes = await getProductAttributesByIds(ids)
    await productAttributeDeleteProductAttributes(ids)
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

export const deleteProductAttributesMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof deleteProductAttributes>[0]["data"]) => deleteProductAttributes({ data }),
  mutationKey: PRODUCT_ATTRIBUTE_MUTATION_KEYS.DELETE,
})
