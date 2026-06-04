import type { z } from "zod/v4";

import type { ProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.types";
import type { productCollection } from "~/src/modules/product-collection/product-collection.schema";
import type { collectionFormSchema, collectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod";

export type CollectionLocaleMap = ProductAttributeLocaleMap;

export interface Collection {
  adminListItem: z.infer<(typeof collectionZodSchemas)["adminListItem"]>;
  createInput: z.infer<(typeof collectionZodSchemas)["createInput"]>;
  deleteInput: z.infer<(typeof collectionZodSchemas)["deleteInput"]>;
  formValues: z.infer<ReturnType<typeof collectionFormSchema>>;
  insert: typeof productCollection.$inferInsert;
  reorderInput: z.infer<(typeof collectionZodSchemas)["reorderInput"]>;
  select: typeof productCollection.$inferSelect;
  stats: z.infer<(typeof collectionZodSchemas)["stats"]>;
  updateInput: z.infer<(typeof collectionZodSchemas)["updateInput"]>;
}
