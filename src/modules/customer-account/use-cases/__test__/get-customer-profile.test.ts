import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { getCustomerProfile, getCustomerProfileQuery } from "~/src/modules/customer-account/use-cases/get-customer-profile"

interface UserRow {
  readonly createdAt: Date
  readonly email: string
  readonly name: string
  readonly phone: string | null
  readonly timezone: string | null
}

const CALLER_CONTEXT = { auth: { session: { id: "session-current" }, user: { id: "customer-1" } } }

const accessors = vi.hoisted(() => ({
  getUserById: vi.fn<(userId: string) => Promise<UserRow | undefined>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/user/user.accessors", () => accessors)
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

const userRow = (overrides: Partial<UserRow> = {}): UserRow => ({
  createdAt: new Date("2025-06-01T00:00:00.000Z"),
  email: "shopper@example.com",
  name: "Anna Kowalska",
  phone: "+48123456789",
  timezone: "Europe/Warsaw",
  ...overrides,
})

describe("getCustomerProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("looks the profile up by the authenticated customer id", async () => {
    accessors.getUserById.mockResolvedValue(userRow())

    await getCustomerProfile()

    expect(accessors.getUserById).toHaveBeenCalledWith("customer-1")
  })

  it("returns the stored contact details", async () => {
    accessors.getUserById.mockResolvedValue(userRow())

    await expect(getCustomerProfile()).resolves.toStrictEqual({
      createdAt: new Date("2025-06-01T00:00:00.000Z"),
      email: "shopper@example.com",
      name: "Anna Kowalska",
      phone: "+48123456789",
      timezone: "Europe/Warsaw",
    })
  })

  it("reports an unset phone and timezone as absent rather than null", async () => {
    accessors.getUserById.mockResolvedValue(userRow({ phone: null, timezone: null }))

    const profile = await getCustomerProfile()

    expect(profile?.phone).toBeUndefined()
    expect(profile?.timezone).toBeUndefined()
  })

  it("returns nothing when the account row has gone", async () => {
    accessors.getUserById.mockResolvedValue(undefined)

    await expect(getCustomerProfile()).resolves.toBeUndefined()
  })
})

describe("getCustomerProfileQuery", () => {
  it("uses the shared profile key and stale window", () => {
    const options = getCustomerProfileQuery()

    expect(options.queryKey).toStrictEqual(CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE)
    expect(options.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })

  it("reads the caller's own profile when the cache runs the query", async () => {
    accessors.getUserById.mockResolvedValue(userRow())

    await expect(new QueryClient().query(getCustomerProfileQuery())).resolves.toStrictEqual({
      createdAt: new Date("2025-06-01T00:00:00.000Z"),
      email: "shopper@example.com",
      name: "Anna Kowalska",
      phone: "+48123456789",
      timezone: "Europe/Warsaw",
    })
  })
})
