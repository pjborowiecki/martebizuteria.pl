import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

const { getSession, currentRequest } = vi.hoisted(() => ({
  currentRequest: vi.fn<() => Request>(),
  getSession: vi.fn<() => Promise<{ user: { id: string; role: string } } | null>>(),
}))

vi.mock("@tanstack/react-start", () => ({ createServerOnlyFn: (fn: unknown) => fn }))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: currentRequest }))
vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { api: { getSession } } }))

describe("request session lookup", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    currentRequest.mockReturnValue(new Request("https://store.test/account"))
  })

  it("shares a pending lookup between concurrent operations in one request", async () => {
    getSession.mockResolvedValue({ user: { id: "customer-1", role: "customer" } })

    const first = getRequestSession()
    const second = getRequestSession()

    expect(first).toBe(second)
    await expect(first).resolves.toStrictEqual({ user: { id: "customer-1", role: "customer" } })
    expect(getSession).toHaveBeenCalledTimes(1)
    expect(getSession).toHaveBeenCalledWith({ headers: currentRequest().headers, query: { disableCookieCache: true } })
  })

  it("revalidates a revoked session on the next HTTP request", async () => {
    getSession.mockResolvedValueOnce({ user: { id: "admin-1", role: "admin" } }).mockResolvedValueOnce(null)
    const headers = { cookie: "session=previously-valid" }

    await expect(getRequestSession(new Request("https://store.test/admin", { headers }))).resolves.toStrictEqual({
      user: { id: "admin-1", role: "admin" },
    })
    await expect(getRequestSession(new Request("https://store.test/admin", { headers }))).resolves.toBeNull()
    expect(getSession).toHaveBeenCalledTimes(2)
  })

  it("keeps anonymous and authenticated requests separate", async () => {
    getSession.mockResolvedValueOnce(null).mockResolvedValueOnce({ user: { id: "customer-2", role: "customer" } })
    const anonymous = new Request("https://store.test")
    const signedIn = new Request("https://store.test", { headers: { cookie: "session=customer-2" } })

    await expect(getRequestSession(anonymous)).resolves.toBeNull()
    await expect(getRequestSession(signedIn)).resolves.toStrictEqual({ user: { id: "customer-2", role: "customer" } })
    await expect(getRequestSession(anonymous)).resolves.toBeNull()
    expect(getSession).toHaveBeenCalledTimes(2)
  })

  it("propagates lookup failure without reusing it for a later request", async () => {
    getSession.mockRejectedValueOnce(new Error("Session store unavailable")).mockResolvedValueOnce(null)

    await expect(getRequestSession()).rejects.toThrow("Session store unavailable")
    await expect(getRequestSession(new Request("https://store.test"))).resolves.toBeNull()
    expect(getSession).toHaveBeenCalledTimes(2)
  })
})
