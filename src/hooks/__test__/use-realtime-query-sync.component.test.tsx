import { type ReactNode } from "react"

import { QueryClient, QueryClientProvider, type QueryKey } from "@tanstack/react-query"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

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

const PRODUCTS_KEY: QueryKey = ["admin", "products"]

const SUBSCRIPTIONS: readonly QueryKey[] = [ORDERS_KEY, PRODUCTS_KEY]

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

const renderSync = (hub: "admin" | "storefront" = "admin") => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const rendered = renderHook(
    () => {
      useRealtimeQuerySync({ hub, subscriptions: SUBSCRIPTIONS })
    },
    { wrapper },
  )

  return { invalidateQueries, ...rendered }
}

beforeEach(() => {
  FakeWebSocket.instances = []
  vi.useFakeTimers()
  vi.stubGlobal("WebSocket", FakeWebSocket)
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

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ORDERS_KEY, refetchType: "all" })
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
