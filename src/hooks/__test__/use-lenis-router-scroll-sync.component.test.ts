import type * as TanStackRouter from "@tanstack/react-router"
import { renderHook, waitFor } from "@testing-library/react"
import { type Mock, beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface RouteEvent {
  readonly fromLocation?: {
    readonly pathname: string
  }
  readonly toLocation: {
    readonly pathname: string
  }
}

interface LenisStub {
  isStopped: boolean
  readonly scroll: number
  readonly scrollTo: Mock<(target: number, options: unknown) => void>
  readonly start: Mock<() => void>
  readonly stop: Mock<() => void>
}

interface TriggerStub {
  readonly kill: Mock<(revert: boolean) => void>
  readonly trigger: unknown
}

const { getAll, getLenisInstance, refresh, subscribe, subscribers, syncLenisToWindowScroll, unsubscribeBeforeLoad, unsubscribeRendered } =
  vi.hoisted(() => ({
    getAll: vi.fn<() => unknown[]>(),
    getLenisInstance: vi.fn<() => unknown>(),
    refresh: vi.fn<() => void>(),
    subscribe: vi.fn<(type: string, listener: (event: RouteEvent) => void) => () => void>(),
    subscribers: new Map<string, (event: RouteEvent) => void>(),
    syncLenisToWindowScroll: vi.fn<() => void>(),
    unsubscribeBeforeLoad: vi.fn<() => void>(),
    unsubscribeRendered: vi.fn<() => void>(),
  }))

vi.mock("~/src/integrations/lenis/lenis.instance", () => ({ getLenisInstance, syncLenisToWindowScroll }))
vi.mock("~/src/integrations/gsap/gsap.config", () => ({ ScrollTrigger: { getAll, refresh } }))
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return {
    ...actual,
    useRouter: () => ({ subscribe }),
    useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
      select({ location: { pathname: "/collections" } }),
  }
})

import { useLenisRouterScrollSync } from "~/src/hooks/use-lenis-router-scroll-sync"

const lenisStub = (isStopped: boolean): LenisStub => ({
  isStopped,
  scroll: 420,
  scrollTo: vi.fn<(target: number, options: unknown) => void>(),
  start: vi.fn<() => void>(),
  stop: vi.fn<() => void>(),
})

const triggerStub = (trigger: unknown): TriggerStub => ({ kill: vi.fn<(revert: boolean) => void>(), trigger })

const emit = (type: "onBeforeLoad" | "onRendered", event: RouteEvent): void => {
  const listener = subscribers.get(type)
  if (listener === undefined) {
    throw new Error(`no listener registered for ${type}`)
  }
  listener(event)
}

const route = (to: string, from?: string): RouteEvent => ({
  ...(from === undefined ? {} : { fromLocation: { pathname: from } }),
  toLocation: { pathname: to },
})

beforeEach(() => {
  subscribers.clear()
  subscribe.mockReset()
  subscribe.mockImplementation((type, listener) => {
    subscribers.set(type, listener)

    return type === "onBeforeLoad" ? unsubscribeBeforeLoad : unsubscribeRendered
  })
  unsubscribeBeforeLoad.mockReset()
  unsubscribeRendered.mockReset()
  getLenisInstance.mockReset()
  syncLenisToWindowScroll.mockReset()
  getAll.mockReset()
  getAll.mockReturnValue([])
  refresh.mockReset()
})

describe("useLenisRouterScrollSync subscriptions", () => {
  it("subscribes to both router phases once", () => {
    renderHook(() => {
      useLenisRouterScrollSync()
    })

    expect(subscribe.mock.calls.map((call) => call[0])).toStrictEqual(["onBeforeLoad", "onRendered"])
  })

  it("releases both subscriptions when the component unmounts", () => {
    const { unmount } = renderHook(() => {
      useLenisRouterScrollSync()
    })

    unmount()

    expect(unsubscribeBeforeLoad).toHaveBeenCalledTimes(1)
    expect(unsubscribeRendered).toHaveBeenCalledTimes(1)
  })
})

describe("useLenisRouterScrollSync before a navigation loads", () => {
  it("leaves scrolling running for a navigation that keeps the same pathname", () => {
    renderHook(() => {
      useLenisRouterScrollSync()
    })

    emit("onBeforeLoad", route("/collections/rings", "/collections/rings"))

    expect(getLenisInstance).not.toHaveBeenCalled()
  })

  it("treats a missing origin as the pathname currently rendered", () => {
    renderHook(() => {
      useLenisRouterScrollSync()
    })

    emit("onBeforeLoad", route("/collections"))

    expect(getLenisInstance).not.toHaveBeenCalled()
  })

  it("pins the viewport and stops scrolling for a real pathname change", () => {
    const lenis = lenisStub(false)
    getLenisInstance.mockReturnValue(lenis)
    renderHook(() => {
      useLenisRouterScrollSync()
    })

    emit("onBeforeLoad", route("/collections/rings", "/collections"))

    expect(lenis.scrollTo).toHaveBeenCalledWith(420, { force: true, immediate: true })
    expect(lenis.stop).toHaveBeenCalledTimes(1)
  })

  it("does nothing when smooth scrolling is not mounted", () => {
    getLenisInstance.mockReturnValue(undefined)
    renderHook(() => {
      useLenisRouterScrollSync()
    })

    expect(() => {
      emit("onBeforeLoad", route("/collections/rings", "/collections"))
    }).not.toThrow()
    expect(syncLenisToWindowScroll).not.toHaveBeenCalled()
  })
})

describe("useLenisRouterScrollSync after a navigation renders", () => {
  it("restarts stopped scrolling and resyncs against the window position", async () => {
    const lenis = lenisStub(true)
    getLenisInstance.mockReturnValue(lenis)
    renderHook(() => {
      useLenisRouterScrollSync()
    })

    emit("onRendered", route("/collections/rings", "/collections"))

    expect(lenis.start).toHaveBeenCalledTimes(1)
    expect(syncLenisToWindowScroll).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1)
    })
    expect(syncLenisToWindowScroll).toHaveBeenCalledTimes(2)
  })

  it("leaves running scrolling alone", async () => {
    const lenis = lenisStub(false)
    getLenisInstance.mockReturnValue(lenis)
    renderHook(() => {
      useLenisRouterScrollSync()
    })

    emit("onRendered", route("/collections/rings", "/collections"))

    expect(lenis.start).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1)
    })
  })

  it("skips the refresh entirely when smooth scrolling is not mounted", () => {
    getLenisInstance.mockReturnValue(undefined)
    renderHook(() => {
      useLenisRouterScrollSync()
    })

    emit("onRendered", route("/collections/rings", "/collections"))

    expect(syncLenisToWindowScroll).not.toHaveBeenCalled()
    expect(getAll).not.toHaveBeenCalled()
  })

  it("kills only the scroll triggers whose element left the document", async () => {
    const attached = triggerStub(document.body)
    const detached = triggerStub(document.createElement("aside"))
    const elementless = triggerStub(undefined)
    getAll.mockReturnValue([attached, detached, elementless])
    getLenisInstance.mockReturnValue(lenisStub(false))
    renderHook(() => {
      useLenisRouterScrollSync()
    })

    emit("onRendered", route("/collections/rings", "/collections"))

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1)
    })
    expect(detached.kill).toHaveBeenCalledWith(false)
    expect(attached.kill).not.toHaveBeenCalled()
    expect(elementless.kill).not.toHaveBeenCalled()
  })
})
