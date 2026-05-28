import type { courier } from "~/src/modules/courier/courier.schema";

export interface Courier {
  insert: typeof courier.$inferInsert;
  select: typeof courier.$inferSelect;
}
