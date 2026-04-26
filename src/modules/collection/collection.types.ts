import type { collection } from "~/src/modules/collection/collection.schema";

export interface Collection {
  insert: typeof collection.$inferInsert;
  select: typeof collection.$inferSelect;
}
