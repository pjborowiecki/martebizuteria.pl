import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  type DrizzleBatchStatement,
  chunkByBoundParameters,
  insertRowChunks,
  runDrizzleBatch,
} from "~/src/integrations/drizzle-orm/drizzle.batch"

const batch = vi.hoisted(() => vi.fn((statements: readonly unknown[]) => Promise.resolve(statements)))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: { batch } }))

const rank = sqliteTable("drizzle_batch_probe", { id: text("id").primaryKey() })

const fourColumns = sqliteTable("drizzle_chunk_probe", {
  id: text("id").primaryKey(),
  label: text("label"),
  note: text("note"),
  owner: text("owner"),
})

const local = drizzle(() => Promise.resolve({ rows: [] }))

const statement = (id: string): DrizzleBatchStatement => local.insert(rank).values({ id })

describe("runDrizzleBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("skips the driver round trip for an empty statement list", async () => {
    await runDrizzleBatch([])

    expect(batch).not.toHaveBeenCalled()
  })

  it("forwards a single statement as a one element batch", async () => {
    const only = statement("only")

    await runDrizzleBatch([only])

    expect(batch).toHaveBeenCalledWith([only])
  })

  it("preserves statement order across a multi statement batch", async () => {
    const first = statement("first")
    const second = statement("second")
    const third = statement("third")

    await runDrizzleBatch([first, second, third])

    expect(batch).toHaveBeenCalledWith([first, second, third])
  })

  it("skips a list whose only slot was never filled in", async () => {
    await runDrizzleBatch(Array.from<DrizzleBatchStatement>({ length: 1 }))

    expect(batch).not.toHaveBeenCalled()
  })

  it("propagates a driver failure instead of swallowing it", async () => {
    batch.mockRejectedValueOnce(new Error("D1_ERROR: constraint failed"))

    await expect(runDrizzleBatch([statement("only")])).rejects.toThrow("D1_ERROR: constraint failed")
  })
})

describe("chunkByBoundParameters", () => {
  it("fills each statement with as many rows as fit within 100 bound parameters", () => {
    const rows = Array.from({ length: 70 }, (_, index) => index)

    expect(chunkByBoundParameters(rows, 3).map((chunk) => chunk.length)).toStrictEqual([33, 33, 4])
  })

  it("leaves room for parameters every statement binds besides its rows", () => {
    const rows = Array.from({ length: 34 }, (_, index) => index)

    expect(chunkByBoundParameters(rows, 3, 1).map((chunk) => chunk.length)).toStrictEqual([33, 1])
  })

  it("produces no statements for no rows", () => {
    expect(chunkByBoundParameters([], 13)).toStrictEqual([])
  })
})

describe("insertRowChunks", () => {
  it("sizes chunks by the number of columns the table can bind per row", () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({ id: String(index) }))

    expect(insertRowChunks(fourColumns, rows).map((chunk) => chunk.length)).toStrictEqual([25, 25, 10])
  })
})
