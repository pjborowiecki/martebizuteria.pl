import type * as ReactRouter from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface QueryRequest {
  readonly queryKey: readonly unknown[]
  readonly staleTime: unknown
}

interface ChildRouteDefinition {
  readonly loader?: (args: {
    context: { locale: string; queryClient: { query: (request: QueryRequest) => Promise<unknown> } }
    params: { id: string }
  }) => Promise<unknown>
}

const captured = vi.hoisted(() => new Map<string, ChildRouteDefinition>())

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  createFileRoute: (path: string) => (options: ChildRouteDefinition) => {
    captured.set(path, options)

    return { options }
  },
}))
vi.mock("~/src/routes/account", () => ({ Route: {} }))
vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => path,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock("~/src/modules/customer-account/use-cases/get-customer-overview", () => ({
  getCustomerOverviewQuery: (locale: string) => ({ queryKey: ["customer-account", "overview", locale] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/list-customer-orders", () => ({
  listCustomerOrdersQuery: () => ({ queryKey: ["customer-account", "orders"] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/get-customer-order", () => ({
  getCustomerOrderQuery: (id: string) => ({ queryKey: ["customer-account", "order", id] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/list-customer-sessions", () => ({
  listCustomerSessionsQuery: () => ({ queryKey: ["customer-account", "sessions"] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/list-customer-login-history", () => ({
  listCustomerLoginHistoryQuery: () => ({ queryKey: ["customer-account", "login-history"] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/revoke-customer-session", () => ({ revokeCustomerSessionMutation: {} }))
vi.mock("~/src/modules/customer-account/use-cases/revoke-other-customer-sessions", () => ({ revokeOtherCustomerSessionsMutation: {} }))

await import("~/src/routes/account.overview")
await import("~/src/routes/account.orders.index")
await import("~/src/routes/account.orders.$id")
await import("~/src/routes/account.sessions")

const query = vi.fn<(request: QueryRequest) => Promise<unknown>>()

const load = (path: string) => {
  const loader = captured.get(path)?.loader
  if (loader === undefined) {
    throw new Error(`Missing loader for ${path}`)
  }

  return loader({ context: { locale: "en-US", queryClient: { query } }, params: { id: "order-7" } })
}

beforeEach(() => {
  query.mockReset().mockResolvedValue([])
})

describe("account page loaders", () => {
  it.each([
    { key: ["customer-account", "overview", "en-US"], path: "/account/overview" },
    { key: ["customer-account", "orders"], path: "/account/orders/" },
    { key: ["customer-account", "order", "order-7"], path: "/account/orders/$id" },
  ])("preloads the page query for $path with its route parameters", async ({ key, path }) => {
    await load(path)

    expect(query).toHaveBeenCalledExactlyOnceWith({ queryKey: key, staleTime: "static" })
  })

  it("starts sessions and login history together and waits for both", async () => {
    const sessions = Promise.withResolvers<unknown[]>()
    const history = Promise.withResolvers<unknown[]>()
    query.mockReturnValueOnce(sessions.promise).mockReturnValueOnce(history.promise)
    const loaded = load("/account/sessions")

    expect(query).toHaveBeenNthCalledWith(1, { queryKey: ["customer-account", "sessions"], staleTime: "static" })
    expect(query).toHaveBeenNthCalledWith(2, { queryKey: ["customer-account", "login-history"], staleTime: "static" })
    sessions.resolve(["session"])
    history.resolve(["login"])

    await expect(loaded).resolves.toStrictEqual([["session"], ["login"]])
  })

  it.each(["/account/overview", "/account/orders/", "/account/orders/$id", "/account/sessions"])(
    "propagates query failures from %s to the route boundary",
    async (path) => {
      const failure = new Error("Account service unavailable")
      query.mockRejectedValueOnce(failure)

      await expect(load(path)).rejects.toBe(failure)
    },
  )
})
