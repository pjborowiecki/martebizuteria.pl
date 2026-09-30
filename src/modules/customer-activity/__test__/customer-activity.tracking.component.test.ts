import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const record = vi.hoisted(() => vi.fn())

vi.mock("~/src/modules/customer-activity/use-cases/record-customer-activity", () => ({ recordCustomerActivity: record }))

import {
  CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY,
  CUSTOMER_ACTIVITY_PAGE_VIEW_STORAGE_PREFIX,
} from "~/src/modules/customer-activity/customer-activity.constants"
import {
  resetCartAbandonedTracking,
  shouldTrackStorefrontPath,
  trackCartAbandoned,
  trackCartItemAdded,
  trackPageViewed,
} from "~/src/modules/customer-activity/customer-activity.tracking"

describe("shouldTrackStorefrontPath", () => {
  it("tracks storefront paths", () => {
    expect(shouldTrackStorefrontPath("/")).toBe(true)
    expect(shouldTrackStorefrontPath("/products/silver-ring")).toBe(true)
  })

  it("skips the admin area", () => {
    expect(shouldTrackStorefrontPath("/admin")).toBe(false)
    expect(shouldTrackStorefrontPath("/en-US/admin/orders")).toBe(false)
  })

  it("skips the account area", () => {
    expect(shouldTrackStorefrontPath("/account")).toBe(false)
    expect(shouldTrackStorefrontPath("/account/orders")).toBe(false)
  })

  it("skips an empty path", () => {
    expect(shouldTrackStorefrontPath("")).toBe(false)
  })
})

describe("trackCartItemAdded", () => {
  beforeEach(() => {
    record.mockReset()
    record.mockResolvedValue({ ok: true, recorded: true })
    sessionStorage.clear()
  })

  it("records the payload under the cart_item_added kind", () => {
    trackCartItemAdded({ productTitle: "Ring", quantity: 2, variantId: "var_1" })

    expect(record).toHaveBeenCalledWith({
      data: { kind: "cart_item_added", productTitle: "Ring", quantity: 2, variantId: "var_1" },
    })
  })

  it("records every add, with no deduplication", () => {
    trackCartItemAdded({ productTitle: "Ring", quantity: 1, variantId: "var_1" })
    trackCartItemAdded({ productTitle: "Ring", quantity: 1, variantId: "var_1" })

    expect(record).toHaveBeenCalledTimes(2)
  })

  it("swallows a failing request", () => {
    record.mockRejectedValue(new Error("offline"))

    expect(() => {
      trackCartItemAdded({ productTitle: "Ring", quantity: 1, variantId: "var_1" })
    }).not.toThrow()
  })
})

describe("trackCartAbandoned", () => {
  beforeEach(() => {
    record.mockReset()
    record.mockResolvedValue({ ok: true, recorded: true })
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it("records once and marks the session", () => {
    trackCartAbandoned({ itemCount: 3, lineCount: 2 })

    expect(record).toHaveBeenCalledWith({ data: { itemCount: 3, kind: "cart_abandoned", lineCount: 2 } })
    expect(sessionStorage.getItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY)).toBe("1")
  })

  it("does not record twice in the same session", () => {
    trackCartAbandoned({ itemCount: 3, lineCount: 2 })
    trackCartAbandoned({ itemCount: 4, lineCount: 3 })

    expect(record).toHaveBeenCalledTimes(1)
  })

  it("records again after the session marker is reset", () => {
    trackCartAbandoned({ itemCount: 3, lineCount: 2 })
    resetCartAbandonedTracking()

    expect(sessionStorage.getItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY)).toBeNull()

    trackCartAbandoned({ itemCount: 1, lineCount: 1 })

    expect(record).toHaveBeenCalledTimes(2)
  })
})

describe("trackPageViewed", () => {
  beforeEach(() => {
    record.mockReset()
    record.mockResolvedValue({ ok: true, recorded: true })
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it("ignores an empty path", () => {
    trackPageViewed("")

    expect(record).not.toHaveBeenCalled()
  })

  it("records the path and marks it in the session", () => {
    trackPageViewed("/products/ring")

    expect(record).toHaveBeenCalledWith({ data: { kind: "page_viewed", path: "/products/ring" } })
    expect(sessionStorage.getItem(`${CUSTOMER_ACTIVITY_PAGE_VIEW_STORAGE_PREFIX}/products/ring`)).toBe("1")
  })

  it("records a repeated path only once per session", () => {
    trackPageViewed("/products/ring")
    trackPageViewed("/products/ring")

    expect(record).toHaveBeenCalledTimes(1)
  })

  it("records each distinct path", () => {
    trackPageViewed("/products/ring")
    trackPageViewed("/products/necklace")

    expect(record).toHaveBeenCalledTimes(2)
  })
})
