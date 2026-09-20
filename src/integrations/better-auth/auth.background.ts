import { AsyncLocalStorage } from "node:async_hooks"
const runSafely = async (task: Promise<unknown> | PromiseLike<unknown>): Promise<void> => {
  try {
    await task
  } catch (error) {
    console.error("[Background Work Failed]:", error)
  }
}
export const scheduleBackgroundWork = (task: Promise<unknown> | PromiseLike<unknown>): void => {
  const store = executionContextStorage.getStore()

  // Without an execution context, still observe task failures.
  if (store === undefined) {
    void runSafely(task)
    return
  }
  store.waitUntil(runSafely(task))
}
interface ExecutionContextLike {
  readonly waitUntil: (promise: Promise<unknown>) => void
}
export const executionContextStorage = new AsyncLocalStorage<ExecutionContextLike>()
