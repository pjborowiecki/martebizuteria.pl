import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  AUDIT_LOG_CATEGORIES,
  AUDIT_LOG_CATEGORY_FILTER,
  AUDIT_LOG_DATE_RANGE,
  AUDIT_LOG_DATE_RANGE_MS,
} from "~/src/modules/audit-log/audit-log.constants"
import {
  formatAdminAuditTarget,
  formatAdminAuditTimestamp,
  isAuditLogCategoryFilter,
  resolveAdminAuditTargetPresentation,
  resolveAuditLogCategoryFilter,
  resolveAuditLogSince,
  resolveStartOfToday,
  serializeAuditMetadata,
  toAdminAuditListItem,
} from "~/src/modules/audit-log/audit-log.utils"

const NOW = new Date(2024, 5, 15, 14, 30, 0)

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

describe("date range resolution", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts today at local midnight, not at the current time", () => {
    const start = resolveStartOfToday()

    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
    expect(start.getMilliseconds()).toBe(0)
    expect(start.getDate()).toBe(15)
  })

  it.each([[undefined], [AUDIT_LOG_DATE_RANGE.ALL]])("leaves the query unbounded for %j", (dateRange) => {
    expect(resolveAuditLogSince(dateRange)).toBeUndefined()
  })

  it("bounds today at local midnight", () => {
    expect(resolveAuditLogSince(AUDIT_LOG_DATE_RANGE.TODAY)).toStrictEqual(resolveStartOfToday())
  })

  it("bounds the seven day range at exactly seven days back", () => {
    expect(resolveAuditLogSince(AUDIT_LOG_DATE_RANGE.DAYS_7)?.getTime()).toBe(NOW.getTime() - AUDIT_LOG_DATE_RANGE_MS.DAYS_7)
  })

  it("bounds the thirty day range at exactly thirty days back", () => {
    expect(resolveAuditLogSince(AUDIT_LOG_DATE_RANGE.DAYS_30)?.getTime()).toBe(NOW.getTime() - AUDIT_LOG_DATE_RANGE_MS.DAYS_30)
  })
})

describe("formatAdminAuditTimestamp", () => {
  it("renders a full local timestamp down to the second", () => {
    const formatted = formatAdminAuditTimestamp(new Date(2024, 5, 15, 14, 30, 5))

    expect(formatted).toContain("2024")
    expect(formatted).toContain("14:30:05")
  })

  it("accepts a stored timestamp string", () => {
    expect(formatAdminAuditTimestamp(new Date(2024, 5, 15).toISOString())).toContain("2024")
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
    expect(toAdminAuditListItem(row).actor).toStrictEqual({
      id: "user-1",
      initials: "AK",
      name: "Anna Kowalska",
      role: "admin",
    })
  })

  it("resolves the readable target from the metadata handle", () => {
    expect(toAdminAuditListItem(row)).toMatchObject({ resourceId: PRODUCT_UUID, target: "silver-ring" })
  })

  it("normalises the nullable columns to absent", () => {
    const item = toAdminAuditListItem({ ...row, actorId: null, detail: null, ip: null, metadata: null, resourceId: null })

    expect(item.actor.id).toBeUndefined()
    expect(item.detail).toBeUndefined()
    expect(item.ip).toBeUndefined()
    expect(item.target).toBe(PRODUCT_UUID)
  })

  it("survives metadata that is not valid JSON", () => {
    expect(toAdminAuditListItem({ ...row, metadata: "{not json" }).target).toBe(PRODUCT_UUID)
  })

  it("survives metadata that parses to something other than an object", () => {
    expect(toAdminAuditListItem({ ...row, metadata: '["silver-ring"]' }).target).toBe(PRODUCT_UUID)
  })

  it("renders the stored timestamp for display", () => {
    expect(toAdminAuditListItem(row).timestamp).toBe(formatAdminAuditTimestamp(row.createdAt))
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
