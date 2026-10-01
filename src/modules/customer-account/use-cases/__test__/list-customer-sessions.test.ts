import { QueryClient } from "@tanstack/react-query"
import { Column, SQL } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { listCustomerSessions, listCustomerSessionsQuery } from "~/src/modules/customer-account/use-cases/list-customer-sessions"

interface SessionRow {
  readonly createdAt: Date
  readonly id: string
  readonly ipAddress: string | null
  readonly updatedAt: Date
  readonly userAgent: string | null
}

const CALLER_CONTEXT = { auth: { session: { id: "session-current" }, user: { id: "customer-1" } } }

const access = vi.hoisted(() => ({
  conditions: [] as unknown[],
  orderBy: vi.fn<() => Promise<unknown[]>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string) => path }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (condition: unknown) => {
          access.conditions.push(condition)

          return { orderBy: access.orderBy }
        },
      }),
    }),
  },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: typeof CALLER_CONTEXT }) => unknown) => () => handler({ context: CALLER_CONTEXT }),
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

const sessionRow = (overrides: Partial<SessionRow> = {}): SessionRow => ({
  createdAt: new Date("2026-01-01T08:00:00.000Z"),
  id: "session-other",
  ipAddress: "203.0.113.7",
  updatedAt: new Date("2026-01-02T09:30:00.000Z"),
  userAgent: "mozilla chrome windows",
  ...overrides,
})

const withSessions = (rows: readonly SessionRow[]) => {
  access.orderBy.mockResolvedValue([...rows])
}

const columnsIn = (condition: unknown): readonly string[] => {
  const chunks = condition instanceof SQL ? condition.queryChunks : []

  return chunks.flatMap((chunk) => {
    if (chunk instanceof SQL) {
      return columnsIn(chunk)
    }

    const name: unknown = chunk instanceof Column ? chunk.name : undefined

    return typeof name === "string" ? [name] : []
  })
}

describe("listCustomerSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    access.conditions = []
  })

  it("returns nothing when the customer has no stored sessions", async () => {
    withSessions([])

    await expect(listCustomerSessions()).resolves.toStrictEqual([])
  })

  it("asks the database to leave expired sessions out, so dead devices are not listed", async () => {
    withSessions([])

    await listCustomerSessions()

    expect(access.conditions).toHaveLength(1)
    expect(columnsIn(access.conditions[0])).toContain("expires_at")
  })

  it("marks the caller's own session as current and every other one as not", async () => {
    withSessions([sessionRow({ id: "session-current" }), sessionRow({ id: "session-other" })])

    const sessions = await listCustomerSessions()

    expect(sessions.map((item) => [item.id, item.isCurrent])).toStrictEqual([
      ["session-current", true],
      ["session-other", false],
    ])
  })

  it("exposes the stored timestamps as creation and last activity", async () => {
    withSessions([sessionRow()])

    const sessions = await listCustomerSessions()

    expect(sessions[0]).toMatchObject({
      createdAt: new Date("2026-01-01T08:00:00.000Z"),
      lastActiveAt: new Date("2026-01-02T09:30:00.000Z"),
    })
  })

  it("drops a missing ip address instead of reporting null", async () => {
    withSessions([sessionRow({ ipAddress: null })])

    const sessions = await listCustomerSessions()

    expect(sessions[0]?.ipAddress).toBeUndefined()
  })

  it.each([
    ["mozilla chrome windows", { browser: "Chrome", device: "Windows", deviceType: "desktop" }],
    ["mobile safari iphone", { browser: "Safari", device: "iPhone", deviceType: "mobile" }],
    ["ipad safari", { browser: "Safari", device: "iPad", deviceType: "tablet" }],
    ["firefox android mobile", { browser: "Firefox", device: "Android", deviceType: "mobile" }],
    ["macintosh edg/124", { browser: "Edge", device: "Mac", deviceType: "desktop" }],
    ["linux opr/110", { browser: "Opera", device: "Linux", deviceType: "desktop" }],
  ])("describes the %s session from its user agent", async (userAgent, expected) => {
    withSessions([sessionRow({ userAgent })])

    const sessions = await listCustomerSessions()

    expect(sessions[0]).toMatchObject(expected)
  })

  it("falls back to an unknown device when the session has no user agent", async () => {
    withSessions([sessionRow({ userAgent: null })])

    const sessions = await listCustomerSessions()

    expect(sessions[0]).toMatchObject({ browser: "Unknown browser", device: "Unknown device", deviceType: "unknown" })
  })
})

describe("listCustomerSessionsQuery", () => {
  it("uses the shared sessions key and stale window", () => {
    const options = listCustomerSessionsQuery()

    expect(options.queryKey).toStrictEqual(CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS)
    expect(options.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })

  it("reads the sessions of the signed in customer", async () => {
    withSessions([sessionRow({ id: "session-current" })])

    const sessions = await new QueryClient().query(listCustomerSessionsQuery())

    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ id: "session-current", isCurrent: true })
  })
})
