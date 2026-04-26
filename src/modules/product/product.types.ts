import type { product } from "~/src/modules/product/product.schema";

export interface Product {
  insert: typeof product.$inferInsert;
  select: typeof product.$inferSelect;
}
