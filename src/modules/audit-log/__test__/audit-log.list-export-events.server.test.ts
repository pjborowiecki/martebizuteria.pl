import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { recordListExportedAudit } from "~/src/modules/audit-log/audit-log.events.server"

const record = vi.hoisted(() => ({
  scheduleAuditLog: vi.fn(),
  scheduleAuditLogFromRequest: vi.fn(),
  scheduleSystemAuditLog: vi.fn(),
}))

vi.mock("~/src/modules/audit-log/audit-log.record.server", () => record)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("recordListExportedAudit", () => {
  it.each([
    { action: AUDIT_LOG_ACTION.CUSTOMER_LIST_EXPORTED, category: "customers", list: "customers" },
    { action: AUDIT_LOG_ACTION.NEWSLETTER_SUBSCRIBER_LIST_EXPORTED, category: "email", list: "newsletterSubscribers" },
    { action: AUDIT_LOG_ACTION.ORDER_LIST_EXPORTED, category: "orders", list: "orders" },
    { action: AUDIT_LOG_ACTION.PRODUCT_LIST_EXPORTED, category: "catalog", list: "products" },
  ] as const)(
    "files an export of the $list list under $category against the admin, with the rows it held",
    ({ action, category, list }) => {
      recordListExportedAudit(list, 42, { metadata: { filters: { search: "anna" } } })

      expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledExactlyOnceWith({
        action,
        category,
        metadata: { filters: { search: "anna" } },
        severity: "info",
        target: "42",
      })
    },
  )

  it("records an export without filters", () => {
    recordListExportedAudit("orders", 0)

    expect(record.scheduleAuditLogFromRequest).toHaveBeenCalledWith(expect.objectContaining({ metadata: undefined, target: "0" }))
  })
})
