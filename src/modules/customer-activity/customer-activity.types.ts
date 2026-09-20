import { type z } from "zod/v4"

import { type customerActivityZodSchemas } from "~/src/modules/customer-activity/customer-activity.zod"

export interface CustomerActivity {
  recordInput: z.infer<(typeof customerActivityZodSchemas)["recordInput"]>
}
