import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

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

import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { currentOrderNumberPeriod, prepareOrderNumberAllocation } from "~/src/modules/order/order.number.server"

const JANUARY_2026 = new Date("2026-01-04T09:00:00.000Z")

const MARCH_2027 = new Date("2027-03-04T09:00:00.000Z")

const numbered = sqliteTable("numbered", { value: text("value").notNull() })

const numberedSchema = z.array(z.object({ value: z.string() }))

const allocate = async (now: Date): Promise<string> => {
  const { orderNumber, statement } = prepareOrderNumberAllocation(now)
  await runDrizzleBatch([statement, db.insert(numbered).values({ value: orderNumber })])
  const [latest] = numberedSchema.parse(sqlite.prepare("select value from numbered order by rowid desc limit 1").all())
  if (latest === undefined) {
    throw new Error("expected the batch to number a row")
  }

  return latest.value
}

const readLastValue = (period: string): number =>
  z.object({ last_value: z.number() }).parse(sqlite.prepare("select last_value from order_number_sequence where period = ?").get(period))
    .last_value

beforeEach(() => {
  sqlite.exec(`
    drop table if exists order_number_sequence;
    drop table if exists numbered;
    create table order_number_sequence (period text primary key, last_value integer not null);
    create table numbered (value text not null unique);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("currentOrderNumberPeriod", () => {
  it("uses the UTC year so the series does not shift with the server timezone", () => {
    expect(currentOrderNumberPeriod(new Date("2026-12-31T23:30:00.000Z"))).toBe("2026")
    expect(currentOrderNumberPeriod(new Date("2027-01-01T00:30:00.000Z"))).toBe("2027")
  })
})

describe("prepareOrderNumberAllocation", () => {
  it("starts a fresh period at one", async () => {
    await expect(allocate(JANUARY_2026)).resolves.toBe("MRT-2026-00001")
  })

  it("hands out consecutive numbers within a period", async () => {
    const numbers = [await allocate(JANUARY_2026), await allocate(JANUARY_2026), await allocate(JANUARY_2026)]

    expect(numbers).toStrictEqual(["MRT-2026-00001", "MRT-2026-00002", "MRT-2026-00003"])
  })

  it("restarts the sequence in a new year without disturbing the old one", async () => {
    await allocate(JANUARY_2026)
    await allocate(JANUARY_2026)

    await expect(allocate(MARCH_2027)).resolves.toBe("MRT-2027-00001")
    await expect(allocate(JANUARY_2026)).resolves.toBe("MRT-2026-00003")
  })

  it("does not truncate a sequence that outgrows the padding", async () => {
    sqlite.exec("insert into order_number_sequence (period, last_value) values ('2026', 1234566)")

    await expect(allocate(JANUARY_2026)).resolves.toBe("MRT-2026-1234567")
  })

  it("never repeats a number across concurrent allocations", async () => {
    await Promise.all(Array.from({ length: 25 }, () => allocate(JANUARY_2026)))

    expect(numberedSchema.parse(sqlite.prepare("select value from numbered").all())).toHaveLength(25)
  })

  it("gives the number back when the batch that used it fails", async () => {
    await allocate(JANUARY_2026)
    const { orderNumber, statement } = prepareOrderNumberAllocation(JANUARY_2026)

    await expect(
      runDrizzleBatch([
        statement,
        db.insert(numbered).values({ value: orderNumber }),
        db.insert(numbered).values({ value: "MRT-2026-00001" }),
      ]),
    ).rejects.toThrow()

    expect(readLastValue("2026")).toBe(1)
    await expect(allocate(JANUARY_2026)).resolves.toBe("MRT-2026-00002")
  })
})
