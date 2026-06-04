import type { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema";

export interface AttributeOnProduct {
  insert: typeof attributeOnProduct.$inferInsert;
  select: typeof attributeOnProduct.$inferSelect;
}
