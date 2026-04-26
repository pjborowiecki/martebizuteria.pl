import type { category } from "~/src/modules/category/category.schema";

export interface Category {
  insert: typeof category.$inferInsert;
  select: typeof category.$inferSelect;
}
