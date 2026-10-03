import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { allocateOrderNumber, currentOrderNumberPeriod, formatOrderNumber } from "~/src/modules/order/order.number.server"

const JANUARY_2026 = new Date("2026-01-04T09:00:00.000Z")

const MARCH_2027 = new Date("2027-03-04T09:00:00.000Z")

beforeEach(() => {
  sqlite.exec(`
    drop table if exists order_number_sequence;
    create table order_number_sequence (period text primary key, last_value integer not null);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("formatOrderNumber", () => {
  it("zero pads the sequence behind the brand prefix and period", () => {
    expect(formatOrderNumber("2026", 42)).toBe("MRT-2026-00042")
  })

  it("does not truncate a sequence that outgrows the padding", () => {
    expect(formatOrderNumber("2026", 1_234_567)).toBe("MRT-2026-1234567")
  })
})

describe("currentOrderNumberPeriod", () => {
  it("uses the UTC year so the series does not shift with the server timezone", () => {
    expect(currentOrderNumberPeriod(new Date("2026-12-31T23:30:00.000Z"))).toBe("2026")
    expect(currentOrderNumberPeriod(new Date("2027-01-01T00:30:00.000Z"))).toBe("2027")
  })
})

describe("allocateOrderNumber", () => {
  it("starts a fresh period at one", async () => {
    await expect(allocateOrderNumber(JANUARY_2026)).resolves.toBe("MRT-2026-00001")
  })

  it("hands out consecutive numbers within a period", async () => {
    const numbers = [
      await allocateOrderNumber(JANUARY_2026),
      await allocateOrderNumber(JANUARY_2026),
      await allocateOrderNumber(JANUARY_2026),
    ]

    expect(numbers).toStrictEqual(["MRT-2026-00001", "MRT-2026-00002", "MRT-2026-00003"])
  })

  it("restarts the sequence in a new year without disturbing the old one", async () => {
    await allocateOrderNumber(JANUARY_2026)
    await allocateOrderNumber(JANUARY_2026)

    await expect(allocateOrderNumber(MARCH_2027)).resolves.toBe("MRT-2027-00001")
    await expect(allocateOrderNumber(JANUARY_2026)).resolves.toBe("MRT-2026-00003")
  })

  it("starts at one when the database writes no sequence row back", async () => {
    sqlite.exec(`
      create trigger order_number_sequence_ignored before insert on order_number_sequence
      begin
        select raise(ignore);
      end;
    `)

    await expect(allocateOrderNumber(JANUARY_2026)).resolves.toBe("MRT-2026-00001")
  })

  it("never repeats a number across concurrent allocations", async () => {
    const allocated = await Promise.all(Array.from({ length: 25 }, () => allocateOrderNumber(JANUARY_2026)))

    expect(new Set(allocated).size).toBe(allocated.length)
  })
})
