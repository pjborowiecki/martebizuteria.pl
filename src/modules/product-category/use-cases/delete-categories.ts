import { createServerFn } from "@tanstack/react-start"

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions"

import { recordCatalogCategoryDeletedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { countProductsForCategories } from "~/src/modules/category-on-product/category-on-product.accessors"
import { CATEGORY_ERROR_CODES } from "~/src/modules/product-category/product-category.constants"
import { countChildCategories, deleteCategories } from "~/src/modules/product-category/product-category.server"
import { categoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

import { scheduleCategoryCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

export const deleteCategoriesFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => categoryZodSchemas.deleteInput.parse(data))
  .handler(async ({ data: ids }) => {
    await assertAdmin()
    const childCount = await countChildCategories(ids)
    if (childCount > 0) {
      throw new Error(CATEGORY_ERROR_CODES.HAS_CHILDREN)
    }
    const productCount = await countProductsForCategories(ids)
    if (productCount > 0) {
      throw new Error(CATEGORY_ERROR_CODES.HAS_PRODUCTS)
    }
    await deleteCategories(ids)
    scheduleCategoryCatalogInvalidation()
    recordCatalogCategoryDeletedAudit(ids.join(", "))
    return { deleted: ids.length, ok: true }
  })
