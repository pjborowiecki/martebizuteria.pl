import { createServerFn } from "@tanstack/react-start";

import {
  revokeCustomerSession,
  revokeOtherCustomerSessions,
  updateCustomerPhone
} from "~/src/modules/customer-account/customer-account.server";
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod";

const updateCustomerPhoneFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => customerAccountZodSchemas.phoneInput.parse(data))
  .handler(({ data: { phone } }) => updateCustomerPhone(phone));

const revokeCustomerSessionFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => customerAccountZodSchemas.sessionIdInput.parse(data))
  .handler(({ data: { sessionId } }) => revokeCustomerSession(sessionId));

const revokeOtherCustomerSessionsFn = createServerFn({ method: "POST" }).handler(async () => {
  await revokeOtherCustomerSessions();
  return { ok: true as const };
});

export const customerAccountMutations = {
  revokeCustomerSessionFn,
  revokeOtherCustomerSessionsFn,
  updateCustomerPhoneFn
};
