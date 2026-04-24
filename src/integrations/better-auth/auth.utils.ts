import { getRequest } from "@tanstack/react-start/server";

const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

interface ExecutionContext {
  waitUntil?: (promise: Promise<unknown>) => void;
}

type VercelGlobal = typeof globalThis & {
  [VERCEL_REQUEST_CONTEXT]?: { get?: () => ExecutionContext };
};

function isThenable(value: unknown): value is Promise<unknown> {
  return typeof value === "object" && value !== null && "then" in value && typeof (value as Record<string, unknown>).then === "function";
}

export function scheduleBackgroundWork(promise: Promise<unknown>): void {
  if (!isThenable(promise)) {
    throw new TypeError(`Expected a Promise, got ${typeof promise}`);
  }

  const req = getRequest() as Request & ExecutionContext;
  if (req.waitUntil) {
    req.waitUntil(promise);
    return;
  }

  const vercelGlobal = globalThis as VercelGlobal;
  const vercelCtx = vercelGlobal[VERCEL_REQUEST_CONTEXT]?.get?.();

  vercelCtx?.waitUntil?.(promise);
}
