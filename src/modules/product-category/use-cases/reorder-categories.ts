import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleCategoryCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { CATEGORY_MUTATION_KEYS } from "~/src/modules/product-category/product-category.constants"
import { getAdminCategoriesQuery, setCategoryRanks } from "~/src/modules/product-category/product-category.server"
import { buildCategoryRankUpdates } from "~/src/modules/product-category/product-category.utils"
import { productCategoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

export const reorderCategories = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["update"] })])
  .validator((input: zod.input<typeof productCategoryZodSchemas.reorderInput>) => productCategoryZodSchemas.reorderInput.parse(input))
  .handler(async ({ data: orderedIds }) => {
    const categories = await getAdminCategoriesQuery.execute()
    const categoriesById = new Map(categories.map((row) => [row.id, row]))
    const updates = buildCategoryRankUpdates(orderedIds, categoriesById)
    await setCategoryRanks(updates)
    scheduleCategoryCatalogInvalidation()

    return { ok: true }
  })

export const reorderCategoriesMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof reorderCategories>[0]["data"]) => reorderCategories({ data }),
  mutationKey: CATEGORY_MUTATION_KEYS.REORDER,
})
