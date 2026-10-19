import { describe, expect, it } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DISCOUNT_ERROR_CODES, DISCOUNT_STATUS, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { refuseTakenDiscountCode, toAdminDiscountListItem, toDiscountInsertValues } from "~/src/modules/discount/discount.utils"

const NOW = new Date("2026-06-01T12:00:00.000Z")

const FORM_VALUES: Discount["adminFormValues"] = {
  code: "  spring-24 ",
  description: "  Spring sale  ",
  endsAt: "2026-06-30T23:59:59.000Z",
  isActive: true,
  maxDiscountAmount: 5000,
  minOrderTotal: 10_000,
  perCustomerLimit: 1,
  startsAt: "2026-06-01T00:00:00+02:00",
  type: DISCOUNT_TYPE.PERCENTAGE,
  usageLimit: 100,
  value: 15,
}

const BARE_VALUES: Discount["adminFormValues"] = {
  code: "BARE",
  isActive: false,
  type: DISCOUNT_TYPE.FIXED_AMOUNT,
  value: 2500,
}

const discountRow = (overrides: Partial<Discount["select"]> = {}): Discount["select"] => ({
  code: "SPRING-24",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  description: null,
  endsAt: null,
  id: "discount-1",
  isActive: true,
  maxDiscountAmount: null,
  minOrderTotal: null,
  perCustomerLimit: null,
  startsAt: null,
  type: DISCOUNT_TYPE.PERCENTAGE,
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  usageCount: 4,
  usageLimit: null,
  value: 15,
  ...overrides,
})

describe("toDiscountInsertValues", () => {
  it("stores the code upper cased, the description trimmed and the window as dates", () => {
    expect(toDiscountInsertValues(FORM_VALUES)).toStrictEqual({
      code: "SPRING-24",
      description: "Spring sale",
      endsAt: new Date("2026-06-30T23:59:59.000Z"),
      isActive: true,
      maxDiscountAmount: 5000,
      minOrderTotal: 10_000,
      perCustomerLimit: 1,
      startsAt: new Date("2026-05-31T22:00:00.000Z"),
      type: DISCOUNT_TYPE.PERCENTAGE,
      usageLimit: 100,
      value: 15,
    })
  })

  it("leaves out every optional field the admin did not fill in", () => {
    expect(toDiscountInsertValues(BARE_VALUES)).toStrictEqual({
      code: "BARE",
      description: undefined,
      endsAt: undefined,
      isActive: false,
      maxDiscountAmount: undefined,
      minOrderTotal: undefined,
      perCustomerLimit: undefined,
      startsAt: undefined,
      type: DISCOUNT_TYPE.FIXED_AMOUNT,
      usageLimit: undefined,
      value: 2500,
    })
  })

  it("treats a description and dates made only of spaces as not given", () => {
    expect(toDiscountInsertValues({ ...BARE_VALUES, description: "   ", endsAt: "  ", startsAt: "" })).toMatchObject({
      description: undefined,
      endsAt: undefined,
      startsAt: undefined,
    })
  })

  it("drops a date it cannot read rather than storing an invalid one", () => {
    expect(toDiscountInsertValues({ ...BARE_VALUES, endsAt: "next tuesday" }).endsAt).toBeUndefined()
  })

  it.each([DISCOUNT_TYPE.FIXED_AMOUNT, DISCOUNT_TYPE.FREE_SHIPPING])(
    "keeps no maximum discount for a %s code, which only a percentage uses",
    (type) => {
      expect(toDiscountInsertValues({ ...BARE_VALUES, maxDiscountAmount: 5000, type }).maxDiscountAmount).toBeUndefined()
    },
  )
})

describe("refuseTakenDiscountCode", () => {
  it("answers a write that broke the unique code, however deeply the driver wrapped it, as a taken code", () => {
    const unique = new Error("UNIQUE constraint failed: discount.code")
    const wrapped = new Error("Failed query: insert into discount", { cause: new Error("D1_ERROR", { cause: unique }) })

    expect(() => refuseTakenDiscountCode(wrapped)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.CONFLICT, message: DISCOUNT_ERROR_CODES.CODE_TAKEN }),
    )
  })

  it.each([
    ["another constraint", new Error("UNIQUE constraint failed: discount_redemption.order_id")],
    ["a failure that is not an error", "D1 is unavailable"],
  ])("passes on %s unchanged", (_name, failure) => {
    expect(() => refuseTakenDiscountCode(failure)).toThrow(failure)
  })
})

describe("toAdminDiscountListItem", () => {
  it("shows every stored limit with its minor-unit name", () => {
    const endsAt = new Date("2026-06-30T00:00:00.000Z")
    const startsAt = new Date("2026-05-15T00:00:00.000Z")
    const row = discountRow({
      description: "Spring sale",
      endsAt,
      maxDiscountAmount: 5000,
      minOrderTotal: 10_000,
      perCustomerLimit: 1,
      startsAt,
      usageLimit: 100,
    })

    expect(toAdminDiscountListItem(row, NOW)).toStrictEqual({
      code: "SPRING-24",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      description: "Spring sale",
      endsAt,
      id: "discount-1",
      isActive: true,
      maxDiscountAmountMinorUnits: 5000,
      minOrderTotalMinorUnits: 10_000,
      perCustomerLimit: 1,
      startsAt,
      status: DISCOUNT_STATUS.ACTIVE,
      type: DISCOUNT_TYPE.PERCENTAGE,
      usageCount: 4,
      usageLimit: 100,
      value: 15,
    })
  })

  it("shows unset limits as absent rather than null", () => {
    expect(toAdminDiscountListItem(discountRow(), NOW)).toMatchObject({
      description: undefined,
      endsAt: undefined,
      maxDiscountAmountMinorUnits: undefined,
      minOrderTotalMinorUnits: undefined,
      perCustomerLimit: undefined,
      startsAt: undefined,
      usageLimit: undefined,
    })
  })

  it("derives the status as of the moment it is given", () => {
    const row = discountRow({ endsAt: new Date("2026-06-15T00:00:00.000Z") })

    expect(toAdminDiscountListItem(row, NOW).status).toBe(DISCOUNT_STATUS.ACTIVE)
    expect(toAdminDiscountListItem(row, new Date("2026-06-16T00:00:00.000Z")).status).toBe(DISCOUNT_STATUS.EXPIRED)
  })
})
