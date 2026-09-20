import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordCatalogAttributeCreatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import {
  PRODUCT_ATTRIBUTE_ERROR_CODES,
  productAttributeTypeUsesAllowedValues,
} from "~/src/modules/product-attribute/product-attribute.constants"
import { productAttribute } from "~/src/modules/product-attribute/product-attribute.schema"
import { getNextProductAttributeRank, getProductAttributeByHandleQuery } from "~/src/modules/product-attribute/product-attribute.server"
import {
  normalizeAllowedValuesForSave,
  normalizeProductAttributeLocaleMapForSave,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod"

import { scheduleProductAttributeCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const createProductAttributeFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => productAttributeZodSchemas.createInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()
    const existing = await getProductAttributeByHandleQuery.execute({ handle: data.handle })
    if (existing !== undefined) {
      throw new Error(PRODUCT_ATTRIBUTE_ERROR_CODES.DUPLICATE_HANDLE)
    }
    const id = uuidv7()
    const rank = await getNextProductAttributeRank()
    await db.insert(productAttribute).values({
      allowedValues: productAttributeTypeUsesAllowedValues(data.type) ? normalizeAllowedValuesForSave(data.allowedValues) : undefined,
      handle: data.handle,
      id,
      rank,
      titles: normalizeProductAttributeLocaleMapForSave(data.titles),
      type: data.type,
      unit: data.unit === "" ? undefined : data.unit,
    })
    scheduleProductAttributeCatalogInvalidation()
    recordCatalogAttributeCreatedAudit(data.handle, { resourceId: id })
    return { handle: data.handle, id }
  })
