import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { getRequest } from "@tanstack/react-start/server"

import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { isStorefrontRead } from "~/src/lib/storefront-read"

export const STOREFRONT_CACHE_NAME = "storefront-reads"

export const STOREFRONT_CACHE_MAX_AGE_SECONDS = 600

export const PUBLIC_CATALOG_TABLES: ReadonlySet<string> = new Set([
  "attribute_on_product",
  "category_on_product",
  "collection_on_product",
  "content_page",
  "courier",
  "delivery_method",
  "inventory",
  "option_on_variant",
  "price_history",
  "product",
  "product_attribute",
  "product_category",
  "product_collection",
  "product_image",
  "product_option",
  "product_option_value",
  "product_variant",
  "store_setting",
])

const TABLE_VALUED_FUNCTIONS: ReadonlySet<string> = new Set(["json_each"])

const STRING_LITERAL = /'(?:[^']|'')*'/gu

const READ_STATEMENT = /^\s*(?:select|with)\b/iu

const WRITE_OR_SCHEMA_KEYWORD = /\b(?:insert|update|delete|replace|upsert|create|drop|alter)\b/iu

const FOREIGN_IDENTIFIER_QUOTE = /[`[]/u

const FROM_CLAUSE_TOKEN = /"\w+"|[(),]|\b(?:from|where|group|order|limit|having|window|union|intersect|except|select|values)\b/giu

const STATEMENT_SOURCE = /\b(?:from|join)\s+"?(?<source>\w+)/giu

const COMMON_TABLE_EXPRESSION = /(?:\bwith(?:\s+recursive)?|,)\s+"?(?<name>\w+)"?\s*(?:\([^)]*\))?\s+as\s*\(/giu

const CACHEABLE_STATEMENT_METHODS: ReadonlySet<PropertyKey> = new Set(["all", "first", "raw"])

const WORKERS_DEV_SUFFIX = ".workers.dev"

const CATALOG_VERSION_TIMEOUT_MS = 100

const matchedGroups = (sql: string, pattern: RegExp, group: string): readonly string[] =>
  Array.from(sql.matchAll(pattern), (match) => match.groups?.[group]).filter((name) => name !== undefined)

const readsOnlyPublicTables = (sql: string): boolean => {
  const localNames = new Set([...matchedGroups(sql, COMMON_TABLE_EXPRESSION, "name"), ...TABLE_VALUED_FUNCTIONS])
  const tables = matchedGroups(sql, STATEMENT_SOURCE, "source").filter((source) => !localNames.has(source))
  if (tables.length === 0) {
    return false
  }

  return tables.every((table) => PUBLIC_CATALOG_TABLES.has(table))
}

const mayJoinWithCommas = (statement: string): boolean => {
  const fromClauseAtDepth: boolean[] = [false]
  const tokens = Array.from(statement.matchAll(FROM_CLAUSE_TOKEN), ([token]) => token)

  return tokens.some((token) => {
    const depth = fromClauseAtDepth.length - 1
    if (token === "(") {
      fromClauseAtDepth.push(false)
      return false
    }

    if (token === ")") {
      fromClauseAtDepth.pop()
      return depth === 0
    }

    if (token === ",") {
      return fromClauseAtDepth[depth] === true
    }

    if (!token.startsWith('"')) {
      fromClauseAtDepth[depth] = token.toLowerCase() === "from"
    }

    return false
  })
}

export const isPublicCatalogRead = (sql: string): boolean => {
  const statement = sql.replaceAll(STRING_LITERAL, "''")
  if (!READ_STATEMENT.test(statement)) {
    return false
  }

  if (WRITE_OR_SCHEMA_KEYWORD.test(statement) || FOREIGN_IDENTIFIER_QUOTE.test(statement) || mayJoinWithCommas(statement)) {
    return false
  }

  return readsOnlyPublicTables(statement)
}

const isWorkersDevRequest = (request: Request): boolean => new URL(request.url).hostname.endsWith(WORKERS_DEV_SUFFIX)

const catalogVersionTimeout = (): Promise<undefined> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(undefined)
    }, CATALOG_VERSION_TIMEOUT_MS)
  })

const fetchCatalogVersion = async (): Promise<string | undefined> => {
  try {
    const hub = env.REALTIME_INVALIDATION_HUB.getByName(REALTIME_INVALIDATION_HUB.STOREFRONT)

    return await Promise.race([hub.storefrontCacheVersion(), catalogVersionTimeout()])
  } catch (error) {
    console.error("[Storefront Cache] The catalogue version could not be read, so this request reads D1:", error)

    return undefined
  }
}

const requestCatalogVersions = new WeakMap<Request, Promise<string | undefined>>()

const catalogVersionFor = (request: Request): Promise<string | undefined> => {
  const known = requestCatalogVersions.get(request)
  if (known !== undefined) {
    return known
  }

  const version = fetchCatalogVersion()
  requestCatalogVersions.set(request, version)

  return version
}

const HEX_RADIX = 16

const HEX_BYTE_WIDTH = 2

const digestHex = async (value: string): Promise<string> => {
  const encoded = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", encoded)

  return [...new Uint8Array(digest)].map((byte) => byte.toString(HEX_RADIX).padStart(HEX_BYTE_WIDTH, "0")).join("")
}

const cacheKeyFor = async (request: Request, version: string, statement: readonly unknown[]): Promise<Request> => {
  const { origin } = new URL(request.url)
  const digest = await digestHex(JSON.stringify(statement))

  return new Request(`${origin}/__storefront-cache/${import.meta.env.BUILD_ID}/${version}/${digest}`)
}

const openStorefrontCache = async (): Promise<Cache | undefined> => {
  try {
    return await caches.open(STOREFRONT_CACHE_NAME)
  } catch (error) {
    console.error("[Storefront Cache] The cache could not be opened, so this request reads D1:", error)

    return undefined
  }
}

const readCachedAnswer = async (cache: Cache, key: Request): Promise<{ readonly answer: unknown } | undefined> => {
  try {
    const cached = await cache.match(key)
    if (cached === undefined) {
      return undefined
    }

    const answer: unknown = await cached.json()

    return { answer }
  } catch (error) {
    console.error("[Storefront Cache] A cached answer could not be read, so this request reads D1:", error)

    return undefined
  }
}

const CACHED_ANSWER_HEADERS = { "Cache-Control": `public, max-age=${String(STOREFRONT_CACHE_MAX_AGE_SECONDS)}` }

const storeAnswer = (cache: Cache, key: Request, answer: unknown): void => {
  const response = Response.json(answer, { headers: CACHED_ANSWER_HEADERS })
  scheduleBackgroundWork(cache.put(key, response))
}

const readThroughCache = async (statement: readonly unknown[], read: () => Promise<unknown>): Promise<unknown> => {
  const request = getRequest()
  if (isWorkersDevRequest(request)) {
    return read()
  }

  const version = await catalogVersionFor(request)
  if (version === undefined) {
    return read()
  }

  const cache = await openStorefrontCache()
  if (cache === undefined) {
    return read()
  }

  const key = await cacheKeyFor(request, version, statement)
  const cached = await readCachedAnswer(cache, key)
  if (cached !== undefined) {
    return cached.answer
  }

  const answer = await read()
  storeAnswer(cache, key, answer)

  return answer
}

const cachedStatements = new WeakMap<D1PreparedStatement, D1PreparedStatement>()

const boundProperty = (target: object, property: PropertyKey): unknown => {
  const value: unknown = Reflect.get(target, property)

  return typeof value === "function" ? value.bind(target) : value
}

const isCacheableCall = (property: PropertyKey, sql: string): boolean => {
  if (!isStorefrontRead() || !CACHEABLE_STATEMENT_METHODS.has(property)) {
    return false
  }

  return isPublicCatalogRead(sql)
}

const cacheStatement = (statement: D1PreparedStatement, sql: string, params: readonly unknown[]): D1PreparedStatement => {
  const cached = new Proxy(statement, {
    get: (target, property) => {
      if (property === "bind") {
        return (...values: unknown[]) => cacheStatement(target.bind(...values), sql, values)
      }

      const value = boundProperty(target, property)
      if (typeof value !== "function" || !isCacheableCall(property, sql)) {
        return value
      }

      return (...args: unknown[]): Promise<unknown> => {
        const call = [String(property), sql, params, args]

        return readThroughCache(call, () => {
          const answer: unknown = Reflect.apply(value, target, args)

          return Promise.resolve(answer)
        })
      }
    },
  })
  cachedStatements.set(cached, statement)

  return cached
}

export const cacheStorefrontReads = (database: D1Database): D1Database =>
  new Proxy(database, {
    get: (target, property) => {
      if (property === "prepare") {
        return (sql: string) => cacheStatement(target.prepare(sql), sql, [])
      }

      if (property === "batch") {
        return (statements: D1PreparedStatement[]) => {
          const prepared = statements.map((statement) => cachedStatements.get(statement) ?? statement)

          return target.batch(prepared)
        }
      }

      return boundProperty(target, property)
    },
  })
