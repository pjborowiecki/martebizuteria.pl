import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { recordCatalogCategoryCreatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { CATEGORY_ERROR_CODES } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { getCategoriesByIds, getCategoryByHandleQuery, getNextRankForParent } from "~/src/modules/product-category/product-category.server"
import { normalizeCategoryParentIdForMutation, toCategoryRow } from "~/src/modules/product-category/product-category.utils"
import { categoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

import { scheduleCategoryCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const createCategoryFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => categoryZodSchemas.createInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()
    const existing = await getCategoryByHandleQuery.execute({
      handle: data.handle,
    })
    if (existing !== undefined) {
      throw new Error(CATEGORY_ERROR_CODES.DUPLICATE_HANDLE)
    }
    const parentId = normalizeCategoryParentIdForMutation(data.parentId)
    if (parentId !== undefined) {
      const rows = await getCategoriesByIds([parentId])
      if (rows.length === 0) {
        throw new Error(CATEGORY_ERROR_CODES.INVALID_PARENT)
      }
    }
    const nextRank = await getNextRankForParent(parentId)
    const id = uuidv7()
    await db.insert(productCategory).values(toCategoryRow(data, id, nextRank))
    scheduleCategoryCatalogInvalidation()
    recordCatalogCategoryCreatedAudit(data.handle)
    return { handle: data.handle, id }
  })
