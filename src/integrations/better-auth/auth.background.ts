import { AsyncLocalStorage } from "node:async_hooks";

interface ExecutionContextLike {
  readonly waitUntil: (promise: Promise<unknown>) => void;
}

export const executionContextStorage = new AsyncLocalStorage<ExecutionContextLike>();

async function runSafely(task: Promise<unknown> | PromiseLike<unknown>): Promise<void> {
  try {
    await task;
  } catch (error) {
    console.error("[Background Work Failed]:", error);
  }
}

export function scheduleBackgroundWork(task: Promise<unknown> | PromiseLike<unknown>): void {
  const store = executionContextStorage.getStore();

  // When the execution context is available, defer the work via `waitUntil` so
  // it survives past the response without blocking it. When it is missing, we
  // must NOT drop the task on the floor (the old `?.waitUntil` did) — run it
  // immediately so the promise is still kept alive and any error surfaces.
  if (store === undefined) {
    void runSafely(task);
    return;
  }

  store.waitUntil(runSafely(task));
}
