import type { z } from "zod/v4";

import type { category } from "~/src/modules/category/category.schema";
import type { categoryFormSchema, categoryZodSchemas } from "~/src/modules/category/category.zod";

export interface Category {
  adminListItem: z.infer<(typeof categoryZodSchemas)["adminListItem"]>;
  createInput: z.infer<(typeof categoryZodSchemas)["createInput"]>;
  deleteInput: z.infer<(typeof categoryZodSchemas)["deleteInput"]>;
  formValues: z.infer<ReturnType<typeof categoryFormSchema>>;
  insert: typeof category.$inferInsert;
  reorderInput: z.infer<(typeof categoryZodSchemas)["reorderInput"]>;
  select: typeof category.$inferSelect;
  stats: z.infer<(typeof categoryZodSchemas)["stats"]>;
  updateInput: z.infer<(typeof categoryZodSchemas)["updateInput"]>;
}
