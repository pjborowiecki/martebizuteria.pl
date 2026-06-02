import type { z } from "zod/v4";

import type { collection } from "~/src/modules/collection/collection.schema";
import type { collectionFormSchema, collectionZodSchemas } from "~/src/modules/collection/collection.zod";

export interface Collection {
  adminListItem: z.infer<(typeof collectionZodSchemas)["adminListItem"]>;
  createInput: z.infer<(typeof collectionZodSchemas)["createInput"]>;
  deleteInput: z.infer<(typeof collectionZodSchemas)["deleteInput"]>;
  formValues: z.infer<ReturnType<typeof collectionFormSchema>>;
  insert: typeof collection.$inferInsert;
  reorderInput: z.infer<(typeof collectionZodSchemas)["reorderInput"]>;
  select: typeof collection.$inferSelect;
  stats: z.infer<(typeof collectionZodSchemas)["stats"]>;
  updateInput: z.infer<(typeof collectionZodSchemas)["updateInput"]>;
}
