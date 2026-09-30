import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("cloudflare:workers", () => ({
  DurableObject: class {
    readonly ctx: unknown
    readonly env: unknown

    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx
      this.env = env
    }
  },
}))

import { REALTIME_INVALIDATION_MESSAGE } from "~/src/integrations/realtime-invalidation/realtime-invalidation.protocol"
import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { TestEnv } from "~/src/durable-objects/__test__/doubles/test-env"
import { TestHubState } from "~/src/durable-objects/__test__/doubles/test-hub-state"
import { TestWebSocket } from "~/src/durable-objects/__test__/doubles/test-web-socket"
import { RealtimeInvalidationHub } from "~/src/durable-objects/realtime-invalidation-hub"

interface ResponseInitDouble {
  readonly status?: number
  readonly webSocket?: WebSocket
}

const pair = { client: new TestWebSocket(), server: new TestWebSocket() }

const isResponseInit = (value: unknown): value is ResponseInitDouble => typeof value === "object" && value !== null

const responseDouble = new Proxy(Response, {
  construct: (_target, args: unknown[]) => {
    const [body, init] = args
    const options = isResponseInit(init) ? init : undefined

    return {
      body: typeof body === "string" ? body : undefined,
      status: options?.status ?? 200,
      webSocket: options?.webSocket,
    }
  },
})

const webSocketPairDouble = new Proxy(Object, {
  construct: () => ({ 0: pair.client, 1: pair.server }),
})

const upgradeRequest = () => new Request("https://marte.test/realtime", { headers: { Upgrade: "websocket" } })

const plainRequest = () => new Request("https://marte.test/realtime")

const createHub = (hubName?: string) => {
  const state = new TestHubState(hubName)

  return { hub: new RealtimeInvalidationHub(state, new TestEnv()), state }
}

beforeEach(() => {
  pair.client = new TestWebSocket()
  pair.server = new TestWebSocket()
  vi.stubGlobal("Response", responseDouble)
  vi.stubGlobal("WebSocketPair", webSocketPairDouble)
})

describe("RealtimeInvalidationHub.fetch", () => {
  it("refuses a plain request that is not a websocket upgrade", () => {
    const { hub } = createHub(REALTIME_INVALIDATION_HUB.ADMIN)

    expect(hub.fetch(plainRequest()).status).toBe(HTTP_STATUS.UPGRADE_REQUIRED)
  })

  it("explains that a websocket was expected", () => {
    const { hub } = createHub(REALTIME_INVALIDATION_HUB.ADMIN)

    expect(hub.fetch(plainRequest()).body).toBe("Expected WebSocket")
  })

  it("refuses an upgrade on a hub that was addressed without a name", () => {
    const { hub } = createHub()
    const response = hub.fetch(upgradeRequest())

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    expect(response.body).toBe("Hub name required")
  })

  it("switches protocols and hands the client end back", () => {
    const { hub } = createHub(REALTIME_INVALIDATION_HUB.STOREFRONT)
    const response = hub.fetch(upgradeRequest())

    expect(response.status).toBe(HTTP_STATUS.SWITCHING_PROTOCOLS)
    expect(response.webSocket).toBe(pair.client)
  })

  it("keeps the server end and tags it with the hub name", () => {
    const { hub, state } = createHub(REALTIME_INVALIDATION_HUB.STOREFRONT)
    hub.fetch(upgradeRequest())

    expect(state.accepted).toStrictEqual([{ tags: [REALTIME_INVALIDATION_HUB.STOREFRONT], ws: pair.server }])
  })

  it("never accepts a socket for a request that was not an upgrade", () => {
    const { hub, state } = createHub(REALTIME_INVALIDATION_HUB.ADMIN)
    hub.fetch(plainRequest())

    expect(state.accepted).toStrictEqual([])
  })

  it("accepts a socket even on a hub name it does not recognise", () => {
    const { hub, state } = createHub("legacy-hub")
    hub.fetch(upgradeRequest())

    expect(state.accepted).toStrictEqual([{ tags: ["legacy-hub"], ws: pair.server }])
  })
})

describe("RealtimeInvalidationHub.notifyInvalidation", () => {
  it("sends nothing when there are no topics to invalidate", () => {
    const { hub, state } = createHub(REALTIME_INVALIDATION_HUB.ADMIN)
    state.taggedSockets = [new TestWebSocket()]
    hub.notifyInvalidation([])

    expect(state.taggedSockets[0]?.sent).toStrictEqual([])
    expect(state.requestedTags).toStrictEqual([])
  })

  it("broadcasts an invalidate message carrying the topics", () => {
    const { hub, state } = createHub(REALTIME_INVALIDATION_HUB.ADMIN)
    state.taggedSockets = [new TestWebSocket()]
    hub.notifyInvalidation(['["orders"]', '["products"]'])

    expect(state.taggedSockets[0]?.sent).toStrictEqual([
      JSON.stringify({ topics: ['["orders"]', '["products"]'], type: REALTIME_INVALIDATION_MESSAGE.INVALIDATE }),
    ])
  })

  it("reaches every socket tagged with its own hub", () => {
    const { hub, state } = createHub(REALTIME_INVALIDATION_HUB.STOREFRONT)
    state.taggedSockets = [new TestWebSocket(), new TestWebSocket()]
    hub.notifyInvalidation(['["products"]'])

    expect(state.requestedTags).toStrictEqual([REALTIME_INVALIDATION_HUB.STOREFRONT])
    expect(state.taggedSockets.every((socket) => socket.sent.length === 1)).toBe(true)
  })

  it("falls back to every socket when the hub has no name", () => {
    const { hub, state } = createHub()
    state.untaggedSockets = [new TestWebSocket()]
    hub.notifyInvalidation(['["products"]'])

    expect(state.requestedTags).toStrictEqual([undefined])
    expect(state.untaggedSockets[0]?.sent).toHaveLength(1)
  })

  it("falls back to every socket when the hub name is not one it knows", () => {
    const { hub, state } = createHub("legacy-hub")
    state.untaggedSockets = [new TestWebSocket()]
    hub.notifyInvalidation(['["products"]'])

    expect(state.requestedTags).toStrictEqual([undefined])
    expect(state.untaggedSockets[0]?.sent).toHaveLength(1)
  })

  it("keeps broadcasting after one dead socket refuses the message", () => {
    const { hub, state } = createHub(REALTIME_INVALIDATION_HUB.ADMIN)
    const dead = new TestWebSocket()
    dead.failOnSend = true
    const alive = new TestWebSocket()
    state.taggedSockets = [dead, alive]
    hub.notifyInvalidation(['["orders"]'])

    expect(alive.sent).toHaveLength(1)
  })
})

describe("RealtimeInvalidationHub socket lifecycle", () => {
  it("closes the socket with the code and reason the client sent", () => {
    const { hub } = createHub(REALTIME_INVALIDATION_HUB.ADMIN)
    const socket = new TestWebSocket()
    hub.webSocketClose(socket, 1000, "client left")

    expect(socket.closed).toStrictEqual([{ code: 1000, reason: "client left" }])
  })

  it("closes a failed socket with the internal error code", () => {
    const { hub } = createHub(REALTIME_INVALIDATION_HUB.ADMIN)
    const socket = new TestWebSocket()
    hub.webSocketError(socket)

    expect(socket.closed).toStrictEqual([{ code: 1011, reason: "WebSocket error" }])
  })
})
