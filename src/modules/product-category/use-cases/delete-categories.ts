import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleCategoryCatalogInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordCatalogCategoryDeletedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { countProductsForCategories } from "~/src/modules/category-on-product/category-on-product.accessors"
import { CATEGORY_ERROR_CODES, CATEGORY_MUTATION_KEYS } from "~/src/modules/product-category/product-category.constants"
import {
  countChildCategories,
  deleteCategories as productCategoryDeleteCategories,
} from "~/src/modules/product-category/product-category.server"
import { productCategoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

export const deleteCategories = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["delete"] })])
  .validator((input: zod.input<typeof productCategoryZodSchemas.deleteInput>) => productCategoryZodSchemas.deleteInput.parse(input))
  .handler(async ({ data: ids }) => {
    const childCount = await countChildCategories(ids)
    if (childCount > 0) {
      throw new AppError(ERROR_CODES.CONFLICT, CATEGORY_ERROR_CODES.HAS_CHILDREN)
    }

    const productCount = await countProductsForCategories(ids)
    if (productCount > 0) {
      throw new AppError(ERROR_CODES.CONFLICT, CATEGORY_ERROR_CODES.HAS_PRODUCTS)
    }
    await productCategoryDeleteCategories(ids)
    scheduleCategoryCatalogInvalidation()
    recordCatalogCategoryDeletedAudit(ids.join(", "))

    return { deleted: ids.length, ok: true }
  })

export const deleteCategoriesMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof deleteCategories>[0]["data"]) => deleteCategories({ data }),
  mutationKey: CATEGORY_MUTATION_KEYS.DELETE,
})
