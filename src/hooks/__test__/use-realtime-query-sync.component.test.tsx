import { type ReactNode } from "react"

import { QueryClient, QueryClientProvider, type QueryKey, useQuery } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { StubBroadcastChannel } from "~/src/platform/testing/mocks/broadcast-channel"

import { serializeQueryKeyPrefix } from "~/src/integrations/realtime-invalidation/realtime-invalidation.protocol"

import { useRealtimeQuerySync } from "~/src/hooks/use-realtime-query-sync"

type Listener = (event: MessageEvent<string>) => void

class FakeWebSocket {
  static instances: FakeWebSocket[] = []

  closeCalls = 0

  readonly url: string

  private readonly listeners = new Map<string, Listener[]>()

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  close(): void {
    this.closeCalls += 1
  }

  emit(type: string, event: MessageEvent<string>): void {
    act(() => {
      for (const listener of this.listeners.get(type) ?? []) {
        listener(event)
      }
    })
  }
}

const ORDERS_KEY: QueryKey = ["admin", "orders"]

const ORDERS_PAGE_KEY: QueryKey = [...ORDERS_KEY, "page", { page: 1 }]

const orderDetailKey = (orderId: string): QueryKey => [...ORDERS_KEY, "detail", orderId]

const PRODUCTS_KEY: QueryKey = ["admin", "products"]

const PRODUCT_STATS_KEY: QueryKey = [...PRODUCTS_KEY, "stats"]

const SUBSCRIPTIONS: readonly QueryKey[] = [ORDERS_KEY, PRODUCTS_KEY]

const NESTED_SUBSCRIPTIONS: readonly QueryKey[] = [PRODUCTS_KEY, PRODUCT_STATS_KEY]

const CATALOGUE_KEY: QueryKey = ["products"]

const CATALOGUE_PAGE_KEY: QueryKey = [...CATALOGUE_KEY, "storefront-page"]

const PRODUCT_KEY: QueryKey = ["product"]

const productKey = (handle: string): QueryKey => [...PRODUCT_KEY, handle]

const NESTED_CATALOGUE_SUBSCRIPTIONS: readonly QueryKey[] = [CATALOGUE_KEY, CATALOGUE_PAGE_KEY]

const PRODUCT_SUBSCRIPTIONS: readonly QueryKey[] = [PRODUCT_KEY]

const invalidatePayload = (topics: readonly string[]): string => JSON.stringify({ topics, type: "invalidate" })

const messageEvent = (data: string): MessageEvent<string> => new MessageEvent("message", { data })

const latestSocket = (): FakeWebSocket => {
  const socket = FakeWebSocket.instances.at(-1)
  if (socket === undefined) {
    throw new Error("No socket was opened")
  }

  return socket
}

const emitInvalidation = (topics: readonly string[]): void => {
  latestSocket().emit("message", messageEvent(invalidatePayload(topics)))
}

const newQueryClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const providerFor =
  (queryClient: QueryClient) =>
  ({ children }: Readonly<{ children: ReactNode }>) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

const renderSync = (hub: "admin" | "storefront" = "admin", subscriptions: readonly QueryKey[] = SUBSCRIPTIONS) => {
  const queryClient = newQueryClient()
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const rendered = renderHook(
    () => {
      useRealtimeQuerySync({ hub, subscriptions })
    },
    { wrapper: providerFor(queryClient) },
  )

  return { invalidateQueries, ...rendered }
}

const renderOrdersPage = (queryClient: QueryClient, ordersPage: () => Promise<string>) =>
  renderHook(
    () => {
      useRealtimeQuerySync({ hub: "admin", subscriptions: SUBSCRIPTIONS })

      return useQuery({ queryFn: ordersPage, queryKey: ORDERS_PAGE_KEY })
    },
    { wrapper: providerFor(queryClient) },
  )

beforeEach(() => {
  FakeWebSocket.instances = []
  StubBroadcastChannel.posted.mockClear()
  vi.useFakeTimers()
  vi.stubGlobal("WebSocket", FakeWebSocket)
  vi.stubGlobal("BroadcastChannel", StubBroadcastChannel)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("useRealtimeQuerySync connection", () => {
  it("opens one socket against the admin hub path", () => {
    renderSync("admin")

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(latestSocket().url.endsWith("/api/realtime/admin/ws")).toBe(true)
  })

  it("opens the storefront hub path for the storefront hub", () => {
    renderSync("storefront")

    expect(latestSocket().url.endsWith("/api/realtime/storefront/ws")).toBe(true)
  })

  it("uses the insecure scheme when the page is served over http", () => {
    renderSync()

    expect(latestSocket().url.startsWith("ws://")).toBe(true)
  })

  it("closes the socket when the component unmounts", () => {
    const { unmount } = renderSync()
    const socket = latestSocket()

    unmount()

    expect(socket.closeCalls).toBe(1)
  })
})

describe("useRealtimeQuerySync invalidation", () => {
  it("invalidates the subscription whose prefix the topic matches", () => {
    const { invalidateQueries } = renderSync()

    emitInvalidation([serializeQueryKeyPrefix(ORDERS_KEY)])

    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ queryKey: ORDERS_KEY }))
  })

  it("invalidates a subscription when the topic is a shorter overlapping prefix", () => {
    const { invalidateQueries } = renderSync()

    emitInvalidation([serializeQueryKeyPrefix(["admin"])])

    expect(invalidateQueries).toHaveBeenCalledTimes(2)
  })

  it("leaves unrelated subscriptions alone", () => {
    const { invalidateQueries } = renderSync()

    emitInvalidation([serializeQueryKeyPrefix(["storefront", "cart"])])

    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it.each([["not json"], [JSON.stringify({ type: "invalidate" })], [JSON.stringify({ topics: [1], type: "invalidate" })]])(
    "ignores the malformed frame %j",
    (data) => {
      const { invalidateQueries } = renderSync()

      latestSocket().emit("message", messageEvent(data))

      expect(invalidateQueries).not.toHaveBeenCalled()
    },
  )

  it("ignores a topic that does not serialize a query key", () => {
    const { invalidateQueries } = renderSync()

    emitInvalidation(['{"not":"an array"}'])

    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})

describe("useRealtimeQuerySync cache policy", () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it("refetches the order page on screen and drops the cached order detail that is not", async () => {
    const queryClient = newQueryClient()
    const ordersPage = vi.fn(() => Promise.resolve("page"))
    const orderDetail = vi.fn(() => Promise.resolve("detail"))
    await queryClient.query({ queryFn: orderDetail, queryKey: orderDetailKey("o2") })
    const { result } = renderOrdersPage(queryClient, ordersPage)
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    ordersPage.mockClear()
    orderDetail.mockClear()

    emitInvalidation([serializeQueryKeyPrefix(ORDERS_KEY)])

    await waitFor(() => {
      expect(ordersPage).toHaveBeenCalledOnce()
    })
    expect(orderDetail).not.toHaveBeenCalled()
    expect(queryClient.getQueryState(orderDetailKey("o2"))).toBeUndefined()
  })

  it("gives a static loader the post-event order when the admin opens it again", async () => {
    const queryClient = newQueryClient()
    const orderDetail = vi.fn<() => Promise<string>>().mockResolvedValueOnce("before the event").mockResolvedValue("after the event")
    await queryClient.query({ queryFn: orderDetail, queryKey: orderDetailKey("o2") })
    renderOrdersPage(queryClient, () => Promise.resolve("page"))

    emitInvalidation([serializeQueryKeyPrefix(ORDERS_KEY)])
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0)
    })

    await expect(queryClient.query({ queryFn: orderDetail, queryKey: orderDetailKey("o2"), staleTime: "static" })).resolves.toBe(
      "after the event",
    )
  })

  it("lets a loader that is still fetching an order finish instead of cancelling it", async () => {
    const queryClient = newQueryClient()
    const response = Promise.withResolvers<string>()
    renderOrdersPage(queryClient, () => Promise.resolve("page"))
    const loading = queryClient.query({ queryFn: () => response.promise, queryKey: orderDetailKey("o3"), staleTime: "static" })

    emitInvalidation([serializeQueryKeyPrefix(ORDERS_KEY)])
    response.resolve("order")

    await expect(loading).resolves.toBe("order")
  })

  it("restarts a loader's refetch of a cached order so it resolves with the post-event response", async () => {
    const queryClient = newQueryClient()
    const preEvent = Promise.withResolvers<string>()
    const orderDetail = vi.fn<() => Promise<string>>().mockReturnValueOnce(preEvent.promise).mockResolvedValue("after the event")
    queryClient.setQueryData(orderDetailKey("o2"), "cached")
    renderOrdersPage(queryClient, () => Promise.resolve("page"))
    const loading = queryClient.query({ queryFn: orderDetail, queryKey: orderDetailKey("o2") })

    emitInvalidation([serializeQueryKeyPrefix(ORDERS_KEY)])
    preEvent.resolve("before the event")

    await expect(loading).resolves.toBe("after the event")
    expect(orderDetail).toHaveBeenCalledTimes(2)
  })

  it("refetches a query on screen once when the frame matches both its subscription and a broader one", async () => {
    const queryClient = newQueryClient()
    const productStats = vi.fn(() => Promise.resolve("stats"))
    const { result } = renderHook(
      () => {
        useRealtimeQuerySync({ hub: "admin", subscriptions: NESTED_SUBSCRIPTIONS })

        return useQuery({ queryFn: productStats, queryKey: PRODUCT_STATS_KEY, staleTime: 60_000 })
      },
      { wrapper: providerFor(queryClient) },
    )
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    productStats.mockClear()

    emitInvalidation([serializeQueryKeyPrefix(PRODUCTS_KEY), serializeQueryKeyPrefix(PRODUCT_STATS_KEY)])
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0)
    })

    expect(productStats).toHaveBeenCalledOnce()
  })

  it("keeps a hub event to its own tab instead of echoing it to the browser's other tabs", () => {
    renderOrdersPage(newQueryClient(), () => Promise.resolve("page"))

    emitInvalidation([serializeQueryKeyPrefix(["admin"])])

    expect(StubBroadcastChannel.posted).not.toHaveBeenCalled()
  })
})

describe("useRealtimeQuerySync topic narrowing", () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it("invalidates a broad topic once instead of again through each nested subscription it covers", () => {
    const { invalidateQueries } = renderSync("storefront", NESTED_CATALOGUE_SUBSCRIPTIONS)

    emitInvalidation([serializeQueryKeyPrefix(CATALOGUE_KEY)])

    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ queryKey: CATALOGUE_KEY }))
  })

  it("invalidates the narrow topic itself rather than the broader subscription it falls under", () => {
    const { invalidateQueries } = renderSync("storefront", PRODUCT_SUBSCRIPTIONS)

    emitInvalidation([serializeQueryKeyPrefix(productKey("p1"))])

    expect(invalidateQueries).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ queryKey: productKey("p1") }))
  })

  it("refetches only the product a narrow topic names, not every product on screen", async () => {
    const queryClient = newQueryClient()
    const firstProduct = vi.fn(() => Promise.resolve("p1"))
    const secondProduct = vi.fn(() => Promise.resolve("p2"))
    const { result } = renderHook(
      () => {
        useRealtimeQuerySync({ hub: "storefront", subscriptions: PRODUCT_SUBSCRIPTIONS })

        return [
          useQuery({ queryFn: firstProduct, queryKey: productKey("p1") }),
          useQuery({ queryFn: secondProduct, queryKey: productKey("p2") }),
        ]
      },
      { wrapper: providerFor(queryClient) },
    )
    await waitFor(() => {
      expect(result.current.every((query) => query.isSuccess)).toBe(true)
    })
    firstProduct.mockClear()
    secondProduct.mockClear()

    emitInvalidation([serializeQueryKeyPrefix(productKey("p1"))])
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0)
    })

    expect(firstProduct).toHaveBeenCalledOnce()
    expect(secondProduct).not.toHaveBeenCalled()
  })
})

describe("useRealtimeQuerySync reconnection", () => {
  it("waits a second before the first reconnect", () => {
    renderSync()

    latestSocket().emit("close", messageEvent(""))

    expect(FakeWebSocket.instances).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it("doubles the wait after each failed attempt", () => {
    renderSync()

    latestSocket().emit("close", messageEvent(""))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    latestSocket().emit("close", messageEvent(""))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(FakeWebSocket.instances).toHaveLength(2)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(FakeWebSocket.instances).toHaveLength(3)
  })

  it("resets the backoff once a connection opens", () => {
    renderSync()

    latestSocket().emit("close", messageEvent(""))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    latestSocket().emit("open", messageEvent(""))
    latestSocket().emit("close", messageEvent(""))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(FakeWebSocket.instances).toHaveLength(3)
  })

  it("cancels the pending reconnect when the component unmounts", () => {
    const { unmount } = renderSync()

    latestSocket().emit("close", messageEvent(""))
    unmount()
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
  })
})

describe("useRealtimeQuerySync after the component is gone", () => {
  it("uses the secure scheme when the page is served over https", () => {
    vi.stubGlobal("location", { host: "marte.test", protocol: "https:" })
    renderSync()

    expect(latestSocket().url).toBe("wss://marte.test/api/realtime/admin/ws")
  })

  it("ignores a socket that closes after the component unmounted", () => {
    const { unmount } = renderSync()
    const socket = latestSocket()

    unmount()
    socket.emit("close", messageEvent(""))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it("abandons a reconnect whose timer outlived the component", () => {
    const { unmount } = renderSync()
    const socket = latestSocket()

    socket.emit("close", messageEvent(""))
    socket.emit("close", messageEvent(""))
    unmount()
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
  })
})
