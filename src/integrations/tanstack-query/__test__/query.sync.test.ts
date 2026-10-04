import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const channel = {
  addEventListener: vi.fn<(type: string, listener: (event: MessageEvent<unknown>) => void) => void>(),
  postMessage: vi.fn(),
}

let openChannelFails = false

class BroadcastChannelStub {
  readonly addEventListener = channel.addEventListener
  readonly postMessage = channel.postMessage

  constructor() {
    if (openChannelFails) {
      throw new Error("Channel unavailable")
    }
  }
}

const BroadcastChannelMock = vi.fn(BroadcastChannelStub)

describe("cross-tab query invalidation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.resetAllMocks()
    openChannelFails = false
    vi.stubGlobal("document", {})
    vi.stubGlobal("BroadcastChannel", BroadcastChannelMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("does not create a channel during module import or server requests", async () => {
    vi.stubGlobal("document", undefined)
    const { setupQueryClientInvalidationBroadcast, syncQueryInvalidation } = await import("~/src/integrations/tanstack-query/query.sync")
    const client = new QueryClient()
    client.setQueryData(["products"], [])

    setupQueryClientInvalidationBroadcast(client)
    await syncQueryInvalidation(client, ["products"])

    expect(BroadcastChannelMock).not.toHaveBeenCalled()
    expect(client.getQueryState(["products"])).toBeUndefined()
  })

  it("drops the cached queries under the received prefix only and registers each client once", async () => {
    const { setupQueryClientInvalidationBroadcast } = await import("~/src/integrations/tanstack-query/query.sync")
    const client = new QueryClient()
    client.setQueryData(["products", "list"], [])
    client.setQueryData(["orders"], [])
    setupQueryClientInvalidationBroadcast(client)
    setupQueryClientInvalidationBroadcast(client)

    const listener = channel.addEventListener.mock.calls[0]?.[1]
    listener?.(new MessageEvent("message", { data: { queryKey: ["products"] } }))

    expect(channel.addEventListener).toHaveBeenCalledTimes(1)
    expect(client.getQueryState(["products", "list"])).toBeUndefined()
    expect(client.getQueryState(["orders"])?.isInvalidated).toBe(false)
    expect(channel.postMessage).not.toHaveBeenCalled()
  })

  it("drops a cached query that no screen shows instead of refetching it", async () => {
    const { setupQueryClientInvalidationBroadcast } = await import("~/src/integrations/tanstack-query/query.sync")
    const client = new QueryClient()
    const productList = vi.fn(() => Promise.resolve(["ring"]))
    await client.query({ queryFn: productList, queryKey: ["products", "list"] })
    setupQueryClientInvalidationBroadcast(client)
    productList.mockClear()

    channel.addEventListener.mock.calls[0]?.[1](new MessageEvent("message", { data: { queryKey: ["products"] } }))

    expect(productList).not.toHaveBeenCalled()
    expect(client.getQueryState(["products", "list"])).toBeUndefined()
  })

  it("refetches a query a screen shows when another tab invalidates it", async () => {
    const { setupQueryClientInvalidationBroadcast } = await import("~/src/integrations/tanstack-query/query.sync")
    const client = new QueryClient()
    const productList = vi.fn(() => Promise.resolve(["ring"]))
    await client.query({ queryFn: productList, queryKey: ["products", "list"] })
    const observer = new QueryObserver(client, { queryFn: productList, queryKey: ["products", "list"], staleTime: Infinity })
    const unsubscribe = observer.subscribe(vi.fn<() => void>())
    setupQueryClientInvalidationBroadcast(client)
    productList.mockClear()

    channel.addEventListener.mock.calls[0]?.[1](new MessageEvent("message", { data: { queryKey: ["products"] } }))
    await vi.waitFor(() => {
      expect(productList).toHaveBeenCalledOnce()
    })
    unsubscribe()
  })

  it.each([undefined, null, {}, { queryKey: "products" }])("ignores malformed channel messages: %j", async (data) => {
    const { setupQueryClientInvalidationBroadcast } = await import("~/src/integrations/tanstack-query/query.sync")
    const client = new QueryClient()
    client.setQueryData(["orders"], [])
    setupQueryClientInvalidationBroadcast(client)

    channel.addEventListener.mock.calls[0]?.[1](new MessageEvent("message", { data }))

    expect(client.getQueryState(["orders"])?.isInvalidated).toBe(false)
  })

  it("drops the cached queries here and posts the key to the other tabs", async () => {
    const { syncQueryInvalidation } = await import("~/src/integrations/tanstack-query/query.sync")
    const client = new QueryClient()
    client.setQueryData(["products"], [])

    await syncQueryInvalidation(client, ["products"])

    expect(channel.postMessage).toHaveBeenCalledWith({ queryKey: ["products"] })
    expect(client.getQueryState(["products"])).toBeUndefined()
  })

  it("still drops the cached queries here when the browser cannot open a channel", async () => {
    openChannelFails = true
    const { syncQueryInvalidation } = await import("~/src/integrations/tanstack-query/query.sync")
    const client = new QueryClient()
    client.setQueryData(["products"], [])

    await syncQueryInvalidation(client, ["products"])

    expect(client.getQueryState(["products"])).toBeUndefined()
  })

  it("still drops the cached queries here when posting to the channel fails", async () => {
    channel.postMessage.mockImplementation(() => {
      throw new Error("Channel closed")
    })

    const { syncQueryInvalidation } = await import("~/src/integrations/tanstack-query/query.sync")
    const client = new QueryClient()
    client.setQueryData(["products"], [])

    await syncQueryInvalidation(client, ["products"])

    expect(client.getQueryState(["products"])).toBeUndefined()
  })
})
