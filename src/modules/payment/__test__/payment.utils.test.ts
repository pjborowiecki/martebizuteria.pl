import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { isCardExpired } from "~/src/modules/payment/payment.utils"

describe("isCardExpired", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-01T00:30:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("flags a card whose year has passed", () => {
    expect(isCardExpired(12, 2025, "UTC")).toBe(true)
  })

  it("keeps a card valid through the whole of its expiry month", () => {
    expect(isCardExpired(10, 2026, "UTC")).toBe(false)
  })

  it("keeps a card usable while its expiry month is still running in the customer's own calendar", () => {
    expect(isCardExpired(9, 2026, "Pacific/Honolulu")).toBe(false)
  })

  it("flags the same card once the expiry month has ended where the customer lives", () => {
    expect(isCardExpired(9, 2026, "Asia/Tokyo")).toBe(true)
  })

  it("never flags a card expiring in a later year", () => {
    expect(isCardExpired(1, 2027, "Asia/Tokyo")).toBe(false)
  })
})
