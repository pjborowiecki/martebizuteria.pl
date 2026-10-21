import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { drizzle } from "drizzle-orm/d1"

import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas"

import { timeD1Statements } from "~/src/lib/server-timing"
import { cacheStorefrontReads } from "~/src/lib/storefront-cache.server"

const instrumentedBinding = (): D1Database => cacheStorefrontReads(timeD1Statements(env.DB))

class DeferredD1Database implements D1Database {
  batch = <TResult = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<TResult>[]> =>
    instrumentedBinding().batch<TResult>(statements)

  dump = (): Promise<ArrayBuffer> => Promise.reject(new Error("D1 dump only applies to alpha databases"))

  exec = (query: string): Promise<D1ExecResult> => instrumentedBinding().exec(query)

  prepare = (query: string): D1PreparedStatement => instrumentedBinding().prepare(query)

  withSession = (constraintOrBookmark?: Parameters<D1Database["withSession"]>[0]): D1DatabaseSession =>
    instrumentedBinding().withSession(constraintOrBookmark)
}

export const db = drizzle(new DeferredD1Database(), { schema })
