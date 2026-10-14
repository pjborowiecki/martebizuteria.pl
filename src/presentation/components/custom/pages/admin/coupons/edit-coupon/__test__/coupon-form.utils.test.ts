import { describe, expect, it } from "vite-plus/test"

import { DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"

import { buildCoupon } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import {
  toCouponFormValues,
  toIsoOrUndefined,
  toLocalInputValue,
} from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form.utils"

describe("toCouponFormValues", () => {
  it("starts a new coupon as an active percentage code with nothing else filled in", () => {
    expect(toCouponFormValues(undefined)).toStrictEqual({
      code: "",
      isActive: true,
      type: DISCOUNT_TYPE.PERCENTAGE,
      value: 0,
    })
  })

  it("carries an existing coupon's limits over under the form's names and its dates as timestamps", () => {
    const startsAt = new Date("2026-06-01T07:30:00.000Z")

    expect(toCouponFormValues(buildCoupon({ maxDiscountAmountMinorUnits: 5000, startsAt }))).toStrictEqual({
      code: "SPRING20",
      description: "Spring campaign",
      endsAt: "2026-06-30T22:00:00.000Z",
      isActive: true,
      maxDiscountAmount: 5000,
      minOrderTotal: 20_000,
      perCustomerLimit: 1,
      startsAt: "2026-06-01T07:30:00.000Z",
      type: DISCOUNT_TYPE.PERCENTAGE,
      usageLimit: 100,
      value: 20,
    })
  })

  it("leaves an open-ended coupon's dates out", () => {
    const values = toCouponFormValues(buildCoupon({ endsAt: undefined }))

    expect(values.endsAt).toBeUndefined()
    expect(values.startsAt).toBeUndefined()
  })
})

describe("toIsoOrUndefined", () => {
  it("turns a local date and time into a timestamp", () => {
    expect(toIsoOrUndefined("2026-11-01T09:00")).toBe(new Date(2026, 10, 1, 9, 0).toISOString())
  })

  it("treats a blank or unreadable date as no date", () => {
    expect(toIsoOrUndefined("  ")).toBeUndefined()
    expect(toIsoOrUndefined("not a date")).toBeUndefined()
  })
})

describe("toLocalInputValue", () => {
  it("shows a timestamp as the admin's local date and time", () => {
    expect(toLocalInputValue(new Date(2026, 5, 30, 23, 59).toISOString())).toBe("2026-06-30T23:59")
  })

  it("shows no date as an empty input", () => {
    expect(toLocalInputValue(undefined)).toBe("")
    expect(toLocalInputValue("")).toBe("")
  })
})
