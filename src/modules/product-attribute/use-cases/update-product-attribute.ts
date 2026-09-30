import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { scheduleProductAttributeCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordCatalogAttributeUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import {
  PRODUCT_ATTRIBUTE_ERROR_CODES,
  productAttributeTypeUsesAllowedValues,
} from "~/src/modules/product-attribute/product-attribute.constants"
import { productAttribute } from "~/src/modules/product-attribute/product-attribute.schema"
import { getProductAttributeByHandleQuery } from "~/src/modules/product-attribute/product-attribute.server"
import {
  normalizeAllowedValuesForSave,
  normalizeProductAttributeLocaleMapForSave,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod"

export const updateProductAttribute = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["update"] })])
  .validator((input: zod.input<typeof productAttributeZodSchemas.updateInput>) => productAttributeZodSchemas.updateInput.parse(input))
  .handler(async ({ data }) => {
    const existing = await getProductAttributeByHandleQuery.execute({ handle: data.handle })
    if (existing !== undefined && existing.id !== data.id) {
      throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ATTRIBUTE_ERROR_CODES.DUPLICATE_HANDLE)
    }
    await db
      .update(productAttribute)
      .set({
        allowedValues: productAttributeTypeUsesAllowedValues(data.type) ? normalizeAllowedValuesForSave(data.allowedValues) : undefined,
        handle: data.handle,
        titles: normalizeProductAttributeLocaleMapForSave(data.titles),
        type: data.type,
        unit: data.unit === "" ? undefined : data.unit,
      })
      .where(eq(productAttribute.id, data.id))
    scheduleProductAttributeCatalogInvalidation()
    recordCatalogAttributeUpdatedAudit(data.handle, { resourceId: data.id })

    return { handle: data.handle, id: data.id }
  })
