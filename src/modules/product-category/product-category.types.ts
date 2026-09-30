import { type z } from "zod/v4"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { type productCategory } from "~/src/modules/product-category/product-category.schema"
import { type productCategoryZodSchemas } from "~/src/modules/product-category/product-category.zod"

type LocaleMap = ProductAttribute["localeMap"]

export interface ProductCategory {
  adminListItem: z.infer<(typeof productCategoryZodSchemas)["adminListItem"]>
  createInput: z.infer<(typeof productCategoryZodSchemas)["createInput"]>
  deleteInput: z.infer<(typeof productCategoryZodSchemas)["deleteInput"]>
  formValues: z.infer<(typeof productCategoryZodSchemas)["formValues"]>
  insert: typeof productCategory.$inferInsert
  localeMap: LocaleMap
  reorderInput: z.infer<(typeof productCategoryZodSchemas)["reorderInput"]>
  select: typeof productCategory.$inferSelect
  stats: z.infer<(typeof productCategoryZodSchemas)["stats"]>
  storefrontListItem: ProductCategory["select"] & {
    productCount: number
  }
  updateInput: z.infer<(typeof productCategoryZodSchemas)["updateInput"]>
}
