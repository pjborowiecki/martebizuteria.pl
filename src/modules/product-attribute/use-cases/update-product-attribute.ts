import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

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

import { scheduleProductAttributeCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const updateProductAttributeFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => productAttributeZodSchemas.updateInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()
    const existing = await getProductAttributeByHandleQuery.execute({ handle: data.handle })
    if (existing !== undefined && existing.id !== data.id) {
      throw new Error(PRODUCT_ATTRIBUTE_ERROR_CODES.DUPLICATE_HANDLE)
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
