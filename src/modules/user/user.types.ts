import type { z } from "zod/v4";

import type { user } from "~/src/modules/user/user.schema";
import type { userZodSchemas } from "~/src/modules/user/user.zod";

export interface User {
  adminCustomerAddressForm: z.infer<(typeof userZodSchemas)["adminCustomerAddressForm"]>;
  adminCustomerDetail: z.infer<(typeof userZodSchemas)["adminCustomerDetail"]>;
  adminCustomerFormValues: z.infer<(typeof userZodSchemas)["adminCustomerFormValues"]>;
  adminCustomerListItem: z.infer<(typeof userZodSchemas)["adminCustomerListItem"]>;
  adminCustomerStats: z.infer<(typeof userZodSchemas)["adminCustomerStats"]>;
  insert: typeof user.$inferInsert;
  select: typeof user.$inferSelect;
}
