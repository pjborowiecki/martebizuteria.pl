import { createServerFn } from "@tanstack/react-start";

import { recordCustomerActivity } from "~/src/modules/customer-activity/customer-activity.record.server";
import { customerActivityZodSchemas } from "~/src/modules/customer-activity/customer-activity.zod";

const recordCustomerActivityFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => customerActivityZodSchemas.recordInput.parse(data))
  .handler(({ data }) => recordCustomerActivity(data));

export const customerActivityMutations = {
  recordCustomerActivityFn
};
