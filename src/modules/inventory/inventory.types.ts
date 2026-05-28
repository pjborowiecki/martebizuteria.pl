import type { inventory } from "~/src/modules/inventory/inventory.schema";

export interface Inventory {
  insert: typeof inventory.$inferInsert;
  select: typeof inventory.$inferSelect;
}
