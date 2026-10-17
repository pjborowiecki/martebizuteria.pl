import { describe, expect, it } from "vite-plus/test"

import { DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"

import { buildCoupon } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import {
  toCouponFormValues,
  toIsoOrUndefined,
  toLocalInputValue,
} from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form.utils"

const WARSAW = "Europe/Warsaw"

const NEW_YORK = "America/New_York"

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
  it("reads the date and time typed as the wall clock of the admin's display time zone", () => {
    expect(toIsoOrUndefined("2026-11-01T09:00", WARSAW)).toBe("2026-11-01T08:00:00.000Z")
    expect(toIsoOrUndefined("2026-11-01T09:00", NEW_YORK)).toBe("2026-11-01T14:00:00.000Z")
  })

  it("follows the display time zone's offset on each side of a daylight saving change", () => {
    expect(toIsoOrUndefined("2026-03-28T12:00", WARSAW)).toBe("2026-03-28T11:00:00.000Z")
    expect(toIsoOrUndefined("2026-03-30T12:00", WARSAW)).toBe("2026-03-30T10:00:00.000Z")
    expect(toIsoOrUndefined("2026-03-07T09:00", NEW_YORK)).toBe("2026-03-07T14:00:00.000Z")
    expect(toIsoOrUndefined("2026-03-09T09:00", NEW_YORK)).toBe("2026-03-09T13:00:00.000Z")
  })

  it("moves a time the clocks skip on by the hour they skip", () => {
    expect(toIsoOrUndefined("2026-03-29T02:30", WARSAW)).toBe("2026-03-29T01:30:00.000Z")
  })

  it("treats a blank or unreadable date as no date", () => {
    expect(toIsoOrUndefined("  ", WARSAW)).toBeUndefined()
    expect(toIsoOrUndefined("not a date", WARSAW)).toBeUndefined()
  })
})

describe("toLocalInputValue", () => {
  it("shows a timestamp as the wall clock of the admin's display time zone", () => {
    expect(toLocalInputValue("2026-06-30T21:59:00.000Z", WARSAW)).toBe("2026-06-30T23:59")
    expect(toLocalInputValue("2026-06-30T21:59:00.000Z", NEW_YORK)).toBe("2026-06-30T17:59")
  })

  it("shows the same wall clock it was given on each side of a daylight saving change", () => {
    expect(toLocalInputValue("2026-10-24T10:00:00.000Z", WARSAW)).toBe("2026-10-24T12:00")
    expect(toLocalInputValue("2026-10-26T11:00:00.000Z", WARSAW)).toBe("2026-10-26T12:00")
    expect(toLocalInputValue(toIsoOrUndefined("2026-11-02T09:00", NEW_YORK), NEW_YORK)).toBe("2026-11-02T09:00")
  })

  it("shows no date as an empty input", () => {
    expect(toLocalInputValue(undefined, WARSAW)).toBe("")
    expect(toLocalInputValue("", WARSAW)).toBe("")
  })
})
