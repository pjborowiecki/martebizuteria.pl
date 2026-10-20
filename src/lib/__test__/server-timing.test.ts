import { DatabaseSync } from "node:sqlite"
import { describe, expect, it } from "vite-plus/test"

import { createTestD1Database } from "~/src/platform/testing/mocks/d1"

import { collectServerTimings, formatServerTimingHeader, timeD1Statements, timeServerWork } from "~/src/lib/server-timing"

const timedDatabase = () => {
  const sqlite = new DatabaseSync(":memory:")
  sqlite.exec('create table "product" ("id" text, "handle" text); insert into "product" values (\'p1\', \'ring\')')
  const rawDatabase = createTestD1Database(sqlite)

  return { binding: timeD1Statements(rawDatabase), rawDatabase }
}

const namesOf = (timings: readonly { readonly name: string }[]): readonly string[] => timings.map(({ name }) => name)

describe("server timing collection", () => {
  it("records how long a piece of work took under its name", async () => {
    const { timings } = await collectServerTimings(() => timeServerWork("render", () => Promise.resolve("page")))

    expect(namesOf(timings)).toStrictEqual(["render"])
    expect(timings[0]?.duration).toBeGreaterThanOrEqual(0)
  })

  it("returns what the timed work returned", async () => {
    const { result } = await collectServerTimings(() => timeServerWork("render", () => Promise.resolve("page")))

    expect(result).toBe("page")
  })

  it("still records work that failed, so a slow error shows up too", async () => {
    const failing = collectServerTimings(() =>
      timeServerWork("d1", () => Promise.reject(new Error("D1 is unavailable"))).catch(() => "failed"),
    )

    await expect(failing).resolves.toMatchObject({ result: "failed", timings: [{ name: "d1" }] })
  })

  it("keeps the timings of two requests handled at once apart", async () => {
    const [first, second] = await Promise.all([
      collectServerTimings(() => timeServerWork("d1", () => Promise.resolve(1))),
      collectServerTimings(() => timeServerWork("render", () => Promise.resolve(2))),
    ])

    expect([namesOf(first.timings), namesOf(second.timings)]).toStrictEqual([["d1"], ["render"]])
  })

  it("ignores work timed outside a request, such as a statement prepared at module load", async () => {
    await timeServerWork("d1", () => Promise.resolve())

    const { timings } = await collectServerTimings(() => Promise.resolve())

    expect(timings).toStrictEqual([])
  })
})

describe("server timing header", () => {
  it("adds up the database statements into one entry with their count, then the render and the whole request", () => {
    expect(
      formatServerTimingHeader(
        [
          { duration: 12.34, name: "d1" },
          { duration: 7.5, name: "d1" },
          { duration: 20, name: "render" },
        ],
        45.55,
      ),
    ).toBe('d1;dur=19.8;desc="statements: 2", render;dur=20.0, total;dur=45.5')
  })

  it("reports a request that read nothing and rendered nothing", () => {
    expect(formatServerTimingHeader([], 3)).toBe('d1;dur=0.0;desc="statements: 0", total;dur=3.0')
  })
})

describe("timed D1 binding", () => {
  it.each(["all", "raw", "run"] as const)("times a statement run with %s", async (method) => {
    const { binding } = timedDatabase()
    const statement = binding.prepare('select "id" from "product" where "handle" = ?').bind("ring")

    const { timings } = await collectServerTimings(() => Promise.resolve(statement[method]()))

    expect(namesOf(timings)).toStrictEqual(["d1"])
  })

  it("hands the statement's answer back unchanged", async () => {
    const { binding } = timedDatabase()

    await expect(binding.prepare('select "id" from "product" where "handle" = ?').bind("ring").all()).resolves.toEqual({
      results: [{ id: "p1" }],
      success: true,
    })
  })

  it("reads other statement properties straight from the statement", () => {
    const { binding } = timedDatabase()

    expect(Reflect.get(binding.prepare('select "id" from "product"').bind(3), "query")).toStrictEqual({
      params: [3],
      sql: 'select "id" from "product"',
    })
  })

  it("times a batch as one round trip", async () => {
    const { binding } = timedDatabase()
    const statements = [binding.prepare('update "product" set "handle" = ?').bind("band"), binding.prepare('select "id" from "product"')]

    const { result, timings } = await collectServerTimings(() => binding.batch(statements))

    expect(result.at(-1)?.results).toEqual([{ id: "p1" }])
    expect(namesOf(timings)).toStrictEqual(["d1"])
  })

  it("still sends a statement that was prepared without the timing wrapper", async () => {
    const { binding, rawDatabase } = timedDatabase()

    const { result } = await collectServerTimings(() => binding.batch([rawDatabase.prepare('select "handle" from "product"')]))

    expect(result[0]?.results).toEqual([{ handle: "ring" }])
  })

  it("passes other binding properties through", () => {
    const { binding, rawDatabase } = timedDatabase()

    expect(Reflect.get(binding, "batch")).not.toBe(Reflect.get(rawDatabase, "batch"))
    expect(Reflect.get(binding, "withSession")).toBeUndefined()
  })
})
