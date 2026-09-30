import { describe, expect, it } from "vite-plus/test"

import { COUPONS, COUPON_STATS } from "~/src/data/coupons"

const USAGE_PATTERN = /^(?<used>\d+) \/ (?<cap>\d+|∞)$/u

describe("COUPONS", () => {
  it("gives every coupon its own id", () => {
    const ids = COUPONS.map((coupon) => coupon.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it("gives every coupon its own code in upper case", () => {
    const codes = COUPONS.map((coupon) => coupon.code)

    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) {
      expect(code).toBe(code.toUpperCase())
    }
  })

  it("uses only known statuses", () => {
    for (const coupon of COUPONS) {
      expect(["active", "expired", "scheduled"]).toContain(coupon.status)
    }
  })

  it("expresses usage as used over cap and never exceeds the cap", () => {
    for (const coupon of COUPONS) {
      const match = USAGE_PATTERN.exec(coupon.usage)

      expect(match).not.toBeNull()
      const used = Number(match?.groups?.["used"])
      const cap = match?.groups?.["cap"]
      if (cap !== undefined && cap !== "∞") {
        expect(used).toBeLessThanOrEqual(Number(cap))
      }
    }
  })

  it("marks a coupon expired once its usage reaches the cap", () => {
    const exhausted = COUPONS.filter((coupon) => coupon.usage === "500 / 500")

    expect(exhausted).not.toHaveLength(0)
    for (const coupon of exhausted) {
      expect(coupon.status).toBe("expired")
    }
  })

  it("shapes the discount according to the coupon type", () => {
    for (const coupon of COUPONS) {
      if (coupon.type === "Percentage") {
        expect(coupon.discount.endsWith("%")).toBe(true)
      }
      if (coupon.type === "Fixed") {
        expect(coupon.discount.startsWith("$")).toBe(true)
      }
    }
  })
})

describe("COUPON_STATS", () => {
  it("gives every stat its own key", () => {
    const keys = COUPON_STATS.map((stat) => stat.key)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it("gives every stat the same sparkline length", () => {
    const lengths = new Set(COUPON_STATS.map((stat) => stat.spark.length))

    expect(lengths.size).toBe(1)
  })

  it("signs the trend to match the up flag", () => {
    for (const stat of COUPON_STATS) {
      expect(stat.trend.startsWith("-")).toBe(!stat.up)
    }
  })
})
