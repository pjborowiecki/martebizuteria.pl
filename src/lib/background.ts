import "@tanstack/react-start/server-only"

import { AsyncLocalStorage } from "node:async_hooks"

export const executionContextStorage = new AsyncLocalStorage<ExecutionContextLike>()

export const scheduleBackgroundWork = (task: Promise<unknown> | PromiseLike<unknown>): void => {
  const store = executionContextStorage.getStore()

  if (store === undefined) {
    void runSafely(task)

    return
  }
  store.waitUntil(runSafely(task))
}

const runSafely = async (task: Promise<unknown> | PromiseLike<unknown>): Promise<void> => {
  try {
    await task
  } catch (error) {
    console.error("[Background Work Failed]:", error)
  }
}

interface ExecutionContextLike {
  readonly waitUntil: (promise: Promise<unknown>) => void
}
