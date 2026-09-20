import { type productVariant } from "~/src/modules/product-variant/product-variant.schema"

export interface ProductVariant {
  insert: typeof productVariant.$inferInsert
  select: typeof productVariant.$inferSelect
}
