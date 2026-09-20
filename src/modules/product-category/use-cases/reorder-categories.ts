import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { getAdminCategoriesQuery, setCategoryRanks } from "~/src/modules/product-category/product-category.server"
import { buildCategoryRankUpdates } from "~/src/modules/product-category/product-category.utils"
import { categoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

import { scheduleCategoryCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const reorderCategoriesFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => categoryZodSchemas.reorderInput.parse(data))
  .handler(async ({ data: orderedIds }) => {
    await assertAdmin()
    const categories = await getAdminCategoriesQuery.execute()
    const categoriesById = new Map(categories.map((row) => [row.id, row]))
    const updates = buildCategoryRankUpdates(orderedIds, categoriesById)
    await setCategoryRanks(updates)
    scheduleCategoryCatalogInvalidation()
    return { ok: true }
  })
