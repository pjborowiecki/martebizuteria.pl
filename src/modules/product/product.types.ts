import type { product } from "~/src/modules/product/product.schema";

export interface Product {
  insert: typeof product.$inferInsert;
  select: typeof product.$inferSelect;
}

// Derived enum type — inferred from column definition, exported for reuse
export type ProductStatus = (typeof product.$inferSelect)["status"];
