import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

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
import { categoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

import { scheduleCategoryCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const updateCategoryFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => categoryZodSchemas.updateInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin()
    const existing = await getCategoryByHandleQuery.execute({
      handle: data.handle,
    })
    if (existing !== undefined && existing.id !== data.id) {
      throw new Error(CATEGORY_ERROR_CODES.DUPLICATE_HANDLE)
    }
    const parentId = normalizeCategoryParentIdForMutation(data.parentId)
    if (parentId === data.id) {
      throw new Error(CATEGORY_ERROR_CODES.INVALID_PARENT)
    }
    if (parentId !== undefined) {
      const categories = await getAdminCategoriesQuery.execute()
      const categoriesById = new Map(categories.map((row) => [row.id, row]))
      if (!categoriesById.has(parentId)) {
        throw new Error(CATEGORY_ERROR_CODES.INVALID_PARENT)
      }
      if (wouldCreateCategoryParentCycle(data.id, parentId, categoriesById)) {
        throw new Error(CATEGORY_ERROR_CODES.INVALID_PARENT)
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
