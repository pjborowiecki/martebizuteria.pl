import type { address } from "~/src/modules/address/address.schema";

export interface Address {
  insert: typeof address.$inferInsert;
  select: typeof address.$inferSelect;
}
