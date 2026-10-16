import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { AUDIT_LOG_ACTION, AUDIT_LOG_CATEGORIES, AUDIT_LOG_CATEGORY_FILTER } from "~/src/modules/audit-log/audit-log.constants"
import {
  buildAuditLogDayFilter,
  formatAdminAuditTarget,
  formatAdminAuditTimestamp,
  isAuditLogCategoryFilter,
  resolveAdminAuditTargetPresentation,
  resolveAuditLogAction,
  resolveAuditLogCategoryFilter,
  resolveAuditLogToday,
  resolveNextAuditLogDayStart,
  serializeAuditMetadata,
  toAdminAuditListItem,
} from "~/src/modules/audit-log/audit-log.utils"

const IN_POLAND = { formatLocale: "pl-PL", timeZone: "Europe/Warsaw" }

const PRODUCT_UUID = "0195b6f4-1111-7000-8000-000000000001"

describe("isAuditLogCategoryFilter", () => {
  it("accepts every configured category plus the all sentinel", () => {
    expect(isAuditLogCategoryFilter(AUDIT_LOG_CATEGORY_FILTER.ALL)).toBe(true)

    for (const category of AUDIT_LOG_CATEGORIES) {
      expect(isAuditLogCategoryFilter(category)).toBe(true)
    }
  })

  it.each([["billing"], ["ALL"], [""], ["toString"]])("rejects the unknown filter %j", (value) => {
    expect(isAuditLogCategoryFilter(value)).toBe(false)
  })
})

describe("resolveAuditLogCategoryFilter", () => {
  it.each([[undefined], [AUDIT_LOG_CATEGORY_FILTER.ALL]])("drops the %j filter so the query stays unconstrained", (value) => {
    expect(resolveAuditLogCategoryFilter(value)).toBeUndefined()
  })

  it("passes a real category through", () => {
    expect(resolveAuditLogCategoryFilter("orders")).toBe("orders")
  })
})

describe("resolveAuditLogToday", () => {
  it.each([
    ["half past midnight in Poland, still the 14th in UTC", "2026-10-14T22:30:00.000Z", "2026-10-15"],
    ["a minute before midnight in Poland", "2026-10-14T21:59:00.000Z", "2026-10-14"],
    ["half past midnight on a winter night", "2026-01-14T23:30:00.000Z", "2026-01-15"],
  ])("names the day in Poland at %s", (_label, instant, expected) => {
    expect(resolveAuditLogToday(IN_POLAND.timeZone, new Date(instant))).toBe(expected)
  })

  describe("without a reference instant", () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: new Date("2026-10-14T23:43:00.000Z") })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("names the day it is in Poland now", () => {
      expect(resolveAuditLogToday(IN_POLAND.timeZone)).toBe("2026-10-15")
    })
  })
})

describe("resolveNextAuditLogDayStart", () => {
  it.each([
    ["half past midnight in Poland, still the 14th in UTC", "2026-10-14T22:30:00.000Z", "2026-10-15T22:00:00.000Z"],
    ["a minute before midnight in Poland", "2026-10-14T21:59:00.000Z", "2026-10-14T22:00:00.000Z"],
    ["the day before the clocks go back", "2026-10-24T12:00:00.000Z", "2026-10-24T22:00:00.000Z"],
    ["the 25-hour day the clocks go back", "2026-10-25T12:00:00.000Z", "2026-10-25T23:00:00.000Z"],
    ["the 23-hour day the clocks go forward", "2026-03-29T12:00:00.000Z", "2026-03-29T22:00:00.000Z"],
    ["the last evening of the year", "2026-12-31T20:00:00.000Z", "2026-12-31T23:00:00.000Z"],
  ])("finds the next midnight in Poland at %s", (_label, instant, expected) => {
    expect(resolveNextAuditLogDayStart(new Date(instant), IN_POLAND.timeZone).toISOString()).toBe(expected)
  })
})

describe("buildAuditLogDayFilter", () => {
  it("filters on the whole of the given day", () => {
    expect(buildAuditLogDayFilter("2026-10-15")).toStrictEqual({ date: "2026-10-15", operator: DATE_COLUMN_FILTER_OPERATOR.ON })
  })
})

describe("formatAdminAuditTimestamp", () => {
  it("renders the time in the viewer's zone and format down to the second, whatever zone the Worker runs in", () => {
    expect(formatAdminAuditTimestamp(new Date("2026-10-14T23:35:07.000Z"), IN_POLAND)).toBe("15 paź 2026, 01:35:07")
  })

  it("renders a winter time an hour ahead of UTC", () => {
    expect(formatAdminAuditTimestamp(new Date("2026-01-15T13:30:05.000Z"), IN_POLAND)).toBe("15 sty 2026, 14:30:05")
  })

  it("follows another viewer's zone and format", () => {
    expect(formatAdminAuditTimestamp(new Date("2026-10-14T23:35:07.000Z"), { formatLocale: "en-US", timeZone: "America/New_York" })).toBe(
      "Oct 14, 2026, 07:35:07 PM",
    )
  })

  it("accepts a stored timestamp string", () => {
    expect(formatAdminAuditTimestamp("2026-10-14T23:35:07.000Z", IN_POLAND)).toBe("15 paź 2026, 01:35:07")
  })
})

describe("resolveAdminAuditTargetPresentation", () => {
  it("shows the target alone when there is nothing better", () => {
    expect(resolveAdminAuditTargetPresentation({ target: "silver-ring" })).toStrictEqual({ label: "silver-ring" })
  })

  it("prefers the metadata email when the target is not already an address", () => {
    expect(resolveAdminAuditTargetPresentation({ metadata: { email: "anna@example.com" }, target: "user-1" })).toStrictEqual({
      label: "anna@example.com",
      resourceId: "user-1",
    })
  })

  it("keeps an email target rather than duplicating it from the metadata", () => {
    expect(resolveAdminAuditTargetPresentation({ metadata: { email: "anna@example.com" }, target: "anna@example.com" })).toStrictEqual({
      label: "anna@example.com",
    })
  })

  it("prefers the metadata handle when the target is an opaque identifier", () => {
    expect(resolveAdminAuditTargetPresentation({ metadata: { handle: "silver-ring" }, target: PRODUCT_UUID })).toStrictEqual({
      label: "silver-ring",
      resourceId: PRODUCT_UUID,
    })
  })

  it("ignores a metadata handle when the target is already readable", () => {
    expect(resolveAdminAuditTargetPresentation({ metadata: { handle: "silver-ring" }, target: "Silver ring" })).toStrictEqual({
      label: "Silver ring",
    })
  })

  it("keeps a resource id that differs from the target", () => {
    expect(resolveAdminAuditTargetPresentation({ resourceId: PRODUCT_UUID, target: "Silver ring" })).toStrictEqual({
      label: "Silver ring",
      resourceId: PRODUCT_UUID,
    })
  })

  it("does not repeat a resource id that already is the target", () => {
    expect(resolveAdminAuditTargetPresentation({ resourceId: PRODUCT_UUID, target: PRODUCT_UUID })).toStrictEqual({ label: PRODUCT_UUID })
  })

  it.each([[{ email: "" }], [{ handle: "" }], [{ email: 7 }]])("ignores the unusable metadata %j", (metadata) => {
    expect(resolveAdminAuditTargetPresentation({ metadata, target: PRODUCT_UUID })).toStrictEqual({ label: PRODUCT_UUID })
  })
})

describe("formatAdminAuditTarget", () => {
  it("shows the target alone when no distinct resource id exists", () => {
    expect(formatAdminAuditTarget("Silver ring")).toBe("Silver ring")
    expect(formatAdminAuditTarget(PRODUCT_UUID, PRODUCT_UUID)).toBe(PRODUCT_UUID)
  })

  it("appends a distinct resource id in parentheses", () => {
    expect(formatAdminAuditTarget("Silver ring", PRODUCT_UUID)).toBe(`Silver ring (${PRODUCT_UUID})`)
  })
})

describe("toAdminAuditListItem", () => {
  const row = {
    action: "product.updated",
    actorId: "user-1",
    actorName: "Anna Kowalska",
    actorRole: "admin" as const,
    category: "catalog" as const,
    createdAt: new Date(2024, 5, 15, 14, 30, 5),
    detail: "Changed the price",
    id: "audit-1",
    ip: "203.0.113.5",
    metadata: JSON.stringify({ handle: "silver-ring" }),
    resourceId: PRODUCT_UUID,
    severity: "info" as const,
    target: PRODUCT_UUID,
  }

  it("derives the actor's initials for the avatar", () => {
    expect(toAdminAuditListItem(row, IN_POLAND).actor).toStrictEqual({
      id: "user-1",
      initials: "AK",
      name: "Anna Kowalska",
      role: "admin",
    })
  })

  it("resolves the readable target from the metadata handle", () => {
    expect(toAdminAuditListItem(row, IN_POLAND)).toMatchObject({ resourceId: PRODUCT_UUID, target: "silver-ring" })
  })

  it("normalises the nullable columns to absent", () => {
    const item = toAdminAuditListItem({ ...row, actorId: null, detail: null, ip: null, metadata: null, resourceId: null }, IN_POLAND)

    expect(item.actor.id).toBeUndefined()
    expect(item.detail).toBeUndefined()
    expect(item.ip).toBeUndefined()
    expect(item.target).toBe(PRODUCT_UUID)
  })

  it("describes the detail from what the row stored instead of passing its text through", () => {
    const sent = toAdminAuditListItem(
      {
        ...row,
        action: "email.sent",
        detail: "Order confirmation → anna@example.com",
        metadata: JSON.stringify({ idempotencyKey: "order-confirmation/order-1" }),
      },
      IN_POLAND,
    )

    expect(sent.detail).toMatchObject({ emailKind: "order-confirmation", kind: "email", recipient: "anna@example.com" })
  })

  it("survives metadata that is not valid JSON", () => {
    expect(toAdminAuditListItem({ ...row, metadata: "{not json" }, IN_POLAND).target).toBe(PRODUCT_UUID)
  })

  it("survives metadata that parses to something other than an object", () => {
    expect(toAdminAuditListItem({ ...row, metadata: '["silver-ring"]' }, IN_POLAND).target).toBe(PRODUCT_UUID)
  })

  it("renders the stored timestamp for display", () => {
    expect(toAdminAuditListItem(row, IN_POLAND).timestamp).toBe(formatAdminAuditTimestamp(row.createdAt, IN_POLAND))
  })
})

describe("serializeAuditMetadata", () => {
  it("stores nothing rather than an empty object", () => {
    expect(serializeAuditMetadata(undefined)).toBeUndefined()
    expect(serializeAuditMetadata({})).toBeUndefined()
  })

  it("stores the metadata as JSON", () => {
    expect(serializeAuditMetadata({ handle: "silver-ring" })).toBe('{"handle":"silver-ring"}')
  })
})

describe("resolveAuditLogAction", () => {
  it("names a delivery that older rows recorded as a release by the order it points at", () => {
    expect(resolveAuditLogAction(AUDIT_LOG_ACTION.ORDER_RELEASED, PRODUCT_UUID)).toBe(AUDIT_LOG_ACTION.ORDER_DELIVERED)
  })

  it("keeps a released checkout session a release", () => {
    expect(resolveAuditLogAction(AUDIT_LOG_ACTION.ORDER_RELEASED, "cs_test_b1HqoLnrFS5AJBFsgn14")).toBe(AUDIT_LOG_ACTION.ORDER_RELEASED)
  })

  it("keeps a release that points at nothing a release", () => {
    expect(resolveAuditLogAction(AUDIT_LOG_ACTION.ORDER_RELEASED, null)).toBe(AUDIT_LOG_ACTION.ORDER_RELEASED)
  })

  it("leaves every other action as recorded", () => {
    expect(resolveAuditLogAction(AUDIT_LOG_ACTION.ORDER_SHIPPED, PRODUCT_UUID)).toBe(AUDIT_LOG_ACTION.ORDER_SHIPPED)
  })
})
