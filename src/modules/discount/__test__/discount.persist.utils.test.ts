import { SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { DISCOUNT_STATUS, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { toAdminDiscountListItem, toDiscountInsertValues, toDiscountUpdateValues } from "~/src/modules/discount/discount.persist.utils"
import { type Discount } from "~/src/modules/discount/discount.types"

const NOW = new Date("2026-06-01T12:00:00.000Z")

const dialect = new SQLiteSyncDialect()

const renderSql = (value: unknown) => (value instanceof SQL ? dialect.sqlToQuery(value) : value)

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
})

describe("toDiscountUpdateValues", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("writes the filled-in values and stamps the update time", () => {
    expect(toDiscountUpdateValues(FORM_VALUES)).toStrictEqual({
      code: "SPRING-24",
      description: "Spring sale",
      endsAt: new Date("2026-06-30T23:59:59.000Z"),
      isActive: true,
      maxDiscountAmount: 5000,
      minOrderTotal: 10_000,
      perCustomerLimit: 1,
      startsAt: new Date("2026-05-31T22:00:00.000Z"),
      type: DISCOUNT_TYPE.PERCENTAGE,
      updatedAt: NOW,
      usageLimit: 100,
      value: 15,
    })
  })

  it("sets every emptied optional column to null so the old value is cleared", () => {
    const values = toDiscountUpdateValues({ ...BARE_VALUES, description: "  ", endsAt: "not a date" })
    const cleared = { params: [], sql: "null" }

    expect(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, renderSql(value)]))).toStrictEqual({
      code: "BARE",
      description: cleared,
      endsAt: cleared,
      isActive: false,
      maxDiscountAmount: cleared,
      minOrderTotal: cleared,
      perCustomerLimit: cleared,
      startsAt: cleared,
      type: DISCOUNT_TYPE.FIXED_AMOUNT,
      updatedAt: NOW,
      usageLimit: cleared,
      value: 2500,
    })
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
