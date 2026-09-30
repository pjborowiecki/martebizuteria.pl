import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { scheduleCategoryCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordCatalogCategoryUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { normalizeProductAttributeLocaleMapForSave } from "~/src/modules/product-attribute/product-attribute.utils"
import { CATEGORY_ERROR_CODES } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { getAdminCategoriesQuery, getCategoryByHandleQuery } from "~/src/modules/product-category/product-category.server"
import {
  normalizeCategoryParentIdForMutation,
  normalizeOptionalCategoryLocaleMapForSave,
  wouldCreateCategoryParentCycle,
} from "~/src/modules/product-category/product-category.utils"
import { productCategoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["update"] })])
  .validator((input: zod.input<typeof productCategoryZodSchemas.updateInput>) => productCategoryZodSchemas.updateInput.parse(input))
  .handler(async ({ data }) => {
    const existing = await getCategoryByHandleQuery.execute({
      handle: data.handle,
    })

    if (existing !== undefined && existing.id !== data.id) {
      throw new AppError(ERROR_CODES.CONFLICT, CATEGORY_ERROR_CODES.DUPLICATE_HANDLE)
    }

    const parentId = normalizeCategoryParentIdForMutation(data.parentId)
    if (parentId === data.id) {
      throw new AppError(ERROR_CODES.VALIDATION, CATEGORY_ERROR_CODES.INVALID_PARENT)
    }

    if (parentId !== undefined) {
      const categories = await getAdminCategoriesQuery.execute()
      const categoriesById = new Map(categories.map((row) => [row.id, row]))
      if (!categoriesById.has(parentId)) {
        throw new AppError(ERROR_CODES.VALIDATION, CATEGORY_ERROR_CODES.INVALID_PARENT)
      }

      if (wouldCreateCategoryParentCycle(data.id, parentId, categoriesById)) {
        throw new AppError(ERROR_CODES.VALIDATION, CATEGORY_ERROR_CODES.INVALID_PARENT)
      }
    }

    const { descriptions, handle, id, image, shortDescriptions, status, subtitles, titles } = data
    await db
      .update(productCategory)
      .set({
        descriptions: normalizeOptionalCategoryLocaleMapForSave(descriptions),
        handle,
        image: image === "" ? undefined : image,
        parentId,
        shortDescriptions: normalizeOptionalCategoryLocaleMapForSave(shortDescriptions),
        status,
        subtitles: normalizeOptionalCategoryLocaleMapForSave(subtitles),
        titles: normalizeProductAttributeLocaleMapForSave(titles),
      })
      .where(eq(productCategory.id, id))
    scheduleCategoryCatalogInvalidation()
    recordCatalogCategoryUpdatedAudit(handle)

    return { handle, id }
  })
