import { type z } from "zod/v4"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { type productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { type productCollectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod"

export interface ProductCollection {
  adminListItem: z.infer<(typeof productCollectionZodSchemas)["adminListItem"]>
  createInput: z.infer<(typeof productCollectionZodSchemas)["createInput"]>
  deleteInput: z.infer<(typeof productCollectionZodSchemas)["deleteInput"]>
  formValues: z.infer<(typeof productCollectionZodSchemas)["formValues"]>
  insert: typeof productCollection.$inferInsert
  localeMap: ProductAttribute["localeMap"]
  reorderInput: z.infer<(typeof productCollectionZodSchemas)["reorderInput"]>
  select: typeof productCollection.$inferSelect
  stats: z.infer<(typeof productCollectionZodSchemas)["stats"]>
  updateInput: z.infer<(typeof productCollectionZodSchemas)["updateInput"]>
}
