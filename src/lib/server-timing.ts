import "@tanstack/react-start/server-only"

import { AsyncLocalStorage } from "node:async_hooks"

type ServerTimingName = "d1" | "render"

export interface ServerTiming {
  readonly duration: number
  readonly name: ServerTimingName
}

const timingStorage = new AsyncLocalStorage<ServerTiming[]>()

export const timeServerWork = async <TResult>(name: ServerTimingName, work: () => Promise<TResult>): Promise<TResult> => {
  const startedAt = performance.now()
  try {
    return await work()
  } finally {
    const duration = performance.now() - startedAt
    timingStorage.getStore()?.push({ duration, name })
  }
}

export const collectServerTimings = async <TResult>(
  work: () => Promise<TResult>,
): Promise<{ readonly result: TResult; readonly timings: readonly ServerTiming[] }> => {
  const timings: ServerTiming[] = []
  const result = await timingStorage.run(timings, work)

  return { result, timings }
}

const milliseconds = (duration: number): string => duration.toFixed(1)

const totalDurationOf = (timings: readonly ServerTiming[]): number => timings.reduce((total, timing) => total + timing.duration, 0)

export const formatServerTimingHeader = (timings: readonly ServerTiming[], requestDuration: number): string => {
  const statements = timings.filter((timing) => timing.name === "d1")
  const statementsDuration = totalDurationOf(statements)
  const d1Entry = `d1;dur=${milliseconds(statementsDuration)};desc="statements: ${String(statements.length)}"`
  const renderEntries = timings.filter((timing) => timing.name === "render").map((render) => `render;dur=${milliseconds(render.duration)}`)
  const totalEntry = `total;dur=${milliseconds(requestDuration)}`

  return [d1Entry, ...renderEntries, totalEntry].join(", ")
}

const TIMED_STATEMENT_METHODS: ReadonlySet<PropertyKey> = new Set(["all", "first", "raw", "run"])

const timedStatements = new WeakMap<D1PreparedStatement, D1PreparedStatement>()

const forwardProperty = (target: object, property: PropertyKey): unknown => {
  const value: unknown = Reflect.get(target, property)

  return typeof value === "function" ? value.bind(target) : value
}

const timeStatement = (statement: D1PreparedStatement): D1PreparedStatement => {
  const timed = new Proxy(statement, {
    get: (target, property) => {
      if (property === "bind") {
        return (...values: unknown[]) => timeStatement(target.bind(...values))
      }

      const value = forwardProperty(target, property)
      if (typeof value !== "function" || !TIMED_STATEMENT_METHODS.has(property)) {
        return value
      }

      return (...args: unknown[]): Promise<unknown> =>
        timeServerWork("d1", () => {
          const answer: unknown = Reflect.apply(value, target, args)

          return Promise.resolve(answer)
        })
    },
  })
  timedStatements.set(timed, statement)

  return timed
}

export const timeD1Statements = (database: D1Database): D1Database =>
  new Proxy(database, {
    get: (target, property) => {
      if (property === "prepare") {
        return (sql: string) => timeStatement(target.prepare(sql))
      }

      if (property === "batch") {
        return (statements: D1PreparedStatement[]) => {
          const prepared = statements.map((statement) => timedStatements.get(statement) ?? statement)

          return timeServerWork("d1", () => target.batch(prepared))
        }
      }

      return forwardProperty(target, property)
    },
  })
