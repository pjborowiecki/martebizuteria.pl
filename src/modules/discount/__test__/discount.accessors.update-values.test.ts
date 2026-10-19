import { SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { toDiscountUpdateValues } from "~/src/modules/discount/discount.accessors"
import { DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))

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

describe("toDiscountUpdateValues for a code that is not a percentage", () => {
  it.each([DISCOUNT_TYPE.FIXED_AMOUNT, DISCOUNT_TYPE.FREE_SHIPPING])("clears the maximum discount a %s code was given", (type) => {
    expect(renderSql(toDiscountUpdateValues({ ...FORM_VALUES, type }).maxDiscountAmount)).toStrictEqual({ params: [], sql: "null" })
  })
})
