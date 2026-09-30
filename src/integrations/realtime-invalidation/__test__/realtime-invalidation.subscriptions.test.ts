import { describe, expect, it } from "vite-plus/test"

import { serializeQueryKeyPrefix } from "~/src/integrations/realtime-invalidation/realtime-invalidation.protocol"
import {
  ADMIN_REALTIME_QUERY_PREFIXES,
  REALTIME_INVALIDATION_HUB,
  STOREFRONT_REALTIME_QUERY_PREFIXES,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { ROUTES } from "~/src/routes"

const topics = (prefixes: readonly (readonly unknown[])[]): string[] => prefixes.map((prefix) => serializeQueryKeyPrefix([...prefix]))

describe("realtime subscription prefixes", () => {
  it.each([
    ["admin", ADMIN_REALTIME_QUERY_PREFIXES],
    ["storefront", STOREFRONT_REALTIME_QUERY_PREFIXES],
  ])("never subscribes the %s hub to an empty prefix that would match every query", (_hub, prefixes) => {
    expect(prefixes.every((prefix) => prefix.length > 0)).toBe(true)
  })

  it("keeps every admin prefix namespaced under admin", () => {
    expect(topics(ADMIN_REALTIME_QUERY_PREFIXES).every((topic) => topic.startsWith('["admin"'))).toBe(true)
  })

  it("keeps the admin namespace out of the storefront hub", () => {
    expect(topics(STOREFRONT_REALTIME_QUERY_PREFIXES).some((topic) => topic.startsWith('["admin"'))).toBe(false)
  })

  it("shares no prefix between the two hubs", () => {
    const adminTopics = new Set(topics(ADMIN_REALTIME_QUERY_PREFIXES))

    expect(topics(STOREFRONT_REALTIME_QUERY_PREFIXES).filter((topic) => adminTopics.has(topic))).toStrictEqual([])
  })

  it.each([
    ["admin", ADMIN_REALTIME_QUERY_PREFIXES],
    ["storefront", STOREFRONT_REALTIME_QUERY_PREFIXES],
  ])("lists each %s prefix once", (_hub, prefixes) => {
    const serialized = topics(prefixes)

    expect(new Set(serialized).size).toBe(serialized.length)
  })

  it("names the hubs after the websocket routes the clients connect to", () => {
    expect(ROUTES.API_REALTIME.ADMIN_WS).toContain(`/${REALTIME_INVALIDATION_HUB.ADMIN}/`)
    expect(ROUTES.API_REALTIME.STOREFRONT_WS).toContain(`/${REALTIME_INVALIDATION_HUB.STOREFRONT}/`)
  })
})
