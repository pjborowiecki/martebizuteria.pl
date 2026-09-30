import { env } from "cloudflare:workers"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { handleRealtimeInvalidationWebSocket } from "~/src/integrations/realtime-invalidation/realtime-invalidation.ws.server"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

const { hub } = vi.hoisted(() => ({
  hub: {
    fetch: vi.fn(() => new Response("upgraded", { headers: { "x-hub": "handshake" } })),
    names: [] as string[],
  },
}))

const { session } = vi.hoisted(() => {
  const state: { role: string | null; value: boolean } = { role: "admin", value: true }

  return { session: state }
})

vi.mock("cloudflare:workers", () => ({
  env: {
    REALTIME_INVALIDATION_HUB: {
      getByName: (name: string) => {
        hub.names.push(name)

        return { fetch: hub.fetch }
      },
    },
  },
}))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getRequestSession: () => Promise.resolve(session.value ? { user: { role: session.role } } : null),
}))

const upgradeRequest = () => new Request("http://127.0.0.1:3000/api/realtime/admin/ws", { headers: { Upgrade: "websocket" } })

describe("handleRealtimeInvalidationWebSocket", () => {
  beforeEach(() => {
    hub.names.length = 0
    hub.fetch.mockClear()
    session.role = "admin"
    session.value = true
  })

  it("rejects a plain request that is not asking to upgrade", async () => {
    const response = await handleRealtimeInvalidationWebSocket(new Request("http://127.0.0.1:3000/api/realtime/admin/ws"), env, "admin")

    expect(response.status).toBe(HTTP_STATUS.UPGRADE_REQUIRED)
    await expect(response.text()).resolves.toBe("Expected WebSocket")
    expect(hub.names).toStrictEqual([])
  })

  it("hands an admin upgrade to the admin hub", async () => {
    const response = await handleRealtimeInvalidationWebSocket(upgradeRequest(), env, "admin")

    expect(response.headers.get("x-hub")).toBe("handshake")
    expect(hub.names).toStrictEqual(["admin"])
  })

  it.each([["customer"], [null]])("refuses an admin socket for the role %j", async (role) => {
    session.role = role
    const response = await handleRealtimeInvalidationWebSocket(upgradeRequest(), env, "admin")

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    await expect(response.text()).resolves.toBe("Unauthorized")
    expect(hub.fetch).not.toHaveBeenCalled()
  })

  it("refuses an admin socket for an anonymous visitor", async () => {
    session.value = false
    const response = await handleRealtimeInvalidationWebSocket(upgradeRequest(), env, "admin")

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  it("lets an anonymous visitor open the storefront hub", async () => {
    session.value = false
    const response = await handleRealtimeInvalidationWebSocket(upgradeRequest(), env, "storefront")

    expect(response.headers.get("x-hub")).toBe("handshake")
    expect(hub.names).toStrictEqual(["storefront"])
  })

  it("forwards the original request so the hub can complete the handshake", async () => {
    const request = upgradeRequest()
    await handleRealtimeInvalidationWebSocket(request, env, "storefront")

    expect(hub.fetch).toHaveBeenCalledExactlyOnceWith(request)
  })
})
