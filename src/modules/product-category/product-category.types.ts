import type { z } from "zod/v4";

import type { ProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.types";
import type { productCategory } from "~/src/modules/product-category/product-category.schema";
import type { categoryFormSchema, categoryZodSchemas } from "~/src/modules/product-category/product-category.zod";

export type CategoryLocaleMap = ProductAttributeLocaleMap;

export interface Category {
  adminListItem: z.infer<(typeof categoryZodSchemas)["adminListItem"]>;
  createInput: z.infer<(typeof categoryZodSchemas)["createInput"]>;
  deleteInput: z.infer<(typeof categoryZodSchemas)["deleteInput"]>;
  formValues: z.infer<ReturnType<typeof categoryFormSchema>>;
  insert: typeof productCategory.$inferInsert;
  reorderInput: z.infer<(typeof categoryZodSchemas)["reorderInput"]>;
  select: typeof productCategory.$inferSelect;
  stats: z.infer<(typeof categoryZodSchemas)["stats"]>;
  updateInput: z.infer<(typeof categoryZodSchemas)["updateInput"]>;
}
