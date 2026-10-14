import { describe, expect, it } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { toAuditActionMessageKey } from "~/src/modules/audit-log/audit-log.utils"

import englishAdminMessages from "~/messages/en-US/pages.admin.json"
import polishAdminMessages from "~/messages/pl-PL/pages.admin.json"

describe.each([
  ["en-US", englishAdminMessages],
  ["pl-PL", polishAdminMessages],
])("%s audit event names", (_locale, messages) => {
  it.each(Object.values(AUDIT_LOG_ACTION))("names the %s event", (action) => {
    expect(messages).toHaveProperty(toAuditActionMessageKey(action), expect.any(String))
  })
})

describe("toAuditActionMessageKey", () => {
  it("turns every dot of a recorded action into the underscore its message key uses", () => {
    expect(toAuditActionMessageKey("customer.cart_item_added")).toBe("audit.actions.customer_cart_item_added")
  })
})
