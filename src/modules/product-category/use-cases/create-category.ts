import { createServerFn } from "@tanstack/react-start"
import { v7 as uuidv7 } from "uuid"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { scheduleCategoryCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordCatalogCategoryCreatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { CATEGORY_ERROR_CODES } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { getCategoriesByIds, getCategoryByHandleQuery, getNextRankForParent } from "~/src/modules/product-category/product-category.server"
import { normalizeCategoryParentIdForMutation, toCategoryRow } from "~/src/modules/product-category/product-category.utils"
import { productCategoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

export const createCategory = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["create"] })])
  .validator((input: zod.input<typeof productCategoryZodSchemas.createInput>) => productCategoryZodSchemas.createInput.parse(input))
  .handler(async ({ data }) => {
    const existing = await getCategoryByHandleQuery.execute({
      handle: data.handle,
    })

    if (existing !== undefined) {
      throw new AppError(ERROR_CODES.CONFLICT, CATEGORY_ERROR_CODES.DUPLICATE_HANDLE)
    }

    const parentId = normalizeCategoryParentIdForMutation(data.parentId)
    if (parentId !== undefined) {
      const rows = await getCategoriesByIds([parentId])
      if (rows.length === 0) {
        throw new AppError(ERROR_CODES.VALIDATION, CATEGORY_ERROR_CODES.INVALID_PARENT)
      }
    }

    const nextRank = await getNextRankForParent(parentId)
    const id = uuidv7()
    await db.insert(productCategory).values(toCategoryRow(data, id, nextRank))
    scheduleCategoryCatalogInvalidation()
    recordCatalogCategoryCreatedAudit(data.handle)

    return { handle: data.handle, id }
  })
