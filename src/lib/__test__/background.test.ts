import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executionContextStorage, scheduleBackgroundWork } from "~/src/lib/background"

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("background work scheduling", () => {
  it("hands the task to the execution context so the worker stays alive", async () => {
    const pending: Promise<unknown>[] = []
    const waitUntil = vi.fn((promise: Promise<unknown>) => {
      pending.push(promise)
    })

    executionContextStorage.run({ waitUntil }, () => {
      scheduleBackgroundWork(Promise.resolve("done"))
    })
    await Promise.all(pending)

    expect(waitUntil).toHaveBeenCalledOnce()
  })

  it("reports a failing task instead of leaving an unhandled rejection", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const failure = new Error("audit write failed")
    const pending: Promise<unknown>[] = []
    const waitUntil = (promise: Promise<unknown>): void => {
      pending.push(promise)
    }

    executionContextStorage.run({ waitUntil }, () => {
      scheduleBackgroundWork(Promise.reject(failure))
    })
    await Promise.all(pending)

    expect(log).toHaveBeenCalledWith("[Background Work Failed]:", failure)
  })

  it("still observes failures when no execution context is bound", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const failure = new Error("no context")

    scheduleBackgroundWork(Promise.reject(failure))
    await vi.waitFor(() => {
      expect(log).toHaveBeenCalledWith("[Background Work Failed]:", failure)
    })
  })
})
