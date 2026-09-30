import { type JSX } from "react"

import { useQueryClient } from "@tanstack/react-query"
import type * as StartServer from "@tanstack/react-start/server"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { currentRequest, devtools, sync } = vi.hoisted(() => ({
  currentRequest: vi.fn<() => Request>(() => new Request("https://marte.test/cart")),
  devtools: vi.fn(() => null),
  sync: { setupQueryClientInvalidationBroadcast: vi.fn() },
}))

vi.mock("@tanstack/react-start/server", async (importOriginal) => {
  const actual = await importOriginal<typeof StartServer>()

  return { ...actual, getRequest: currentRequest }
})
vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "",
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock("~/src/integrations/tanstack-query/query.sync", () => sync)
vi.mock("@tanstack/react-query-devtools", () => ({ ReactQueryDevtools: devtools }))
vi.mock("~/src/routeTree.gen", async () => {
  const { createRootRoute } = await import("@tanstack/react-router")

  return { routeTree: createRootRoute() }
})

import { DefaultErrorComponent } from "~/src/presentation/components/custom/defaults/default-error-component"
import { DefaultNotFoundComponent } from "~/src/presentation/components/custom/defaults/default-not-found-component"
import { DefaultPendingComponent } from "~/src/presentation/components/custom/defaults/default-pending-component"

import { getRouter } from "~/src/router"

const rewritten = (direction: "input" | "output", href: string): string => {
  const rewrite = getRouter().options.rewrite?.[direction]

  if (rewrite === undefined) {
    throw new Error(`the router does not rewrite the ${direction} location`)
  }

  return String(rewrite({ url: new URL(href) }))
}

beforeEach(() => {
  vi.clearAllMocks()
  currentRequest.mockReturnValue(new Request("https://marte.test/cart"))
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe("router defaults", () => {
  it("preloads a route as soon as a visitor shows intent, and close to the pointer", () => {
    const { options } = getRouter()

    expect(options.defaultPreload).toBe("intent")
    expect(options.defaultPreloadDelay).toBe(100)
    expect(options.defaultPreloadIntentProximity).toBe(1000)
    expect(options.defaultPreloadStaleTime).toBe(0)
  })

  it("keeps loaded route data fresh for a minute", () => {
    expect(getRouter().options.defaultStaleTime).toBe(60_000)
  })

  it("waits before showing a spinner and then keeps it on screen long enough to read", () => {
    const { options } = getRouter()

    expect(options.defaultPendingMs).toBe(200)
    expect(options.defaultPendingMinMs).toBe(300)
  })

  it("falls back to the shared pending, error and not-found screens", () => {
    const { options } = getRouter()

    expect(options.defaultPendingComponent).toBe(DefaultPendingComponent)
    expect(options.defaultErrorComponent).toBe(DefaultErrorComponent)
    expect(options.defaultNotFoundComponent).toBe(DefaultNotFoundComponent)
  })

  it("jumps straight back to the remembered scroll position", () => {
    const { options } = getRouter()

    expect(options.scrollRestoration).toBe(true)
    expect(options.scrollRestorationBehavior).toBe("instant")
  })
})

describe("router cache", () => {
  it("serves cached query data for a minute and keeps it for five", () => {
    const { queries } = getRouter().options.context.queryClient.getDefaultOptions()

    expect(queries?.staleTime).toBe(60_000)
    expect(queries?.gcTime).toBe(300_000)
  })

  it("hands the query client and the image prefetch service to every route", () => {
    const { context } = getRouter().options
    context.imagePrefetchService.markSeen("https://cdn.test/ring.webp")

    expect(context.imagePrefetchService.isSeen("https://cdn.test/ring.webp")).toBe(true)
    expect(context.queryClient.getDefaultOptions().queries?.staleTime).toBe(60_000)
  })

  it("gives each router its own cache so one visitor cannot read another's data", () => {
    expect(getRouter().options.context.queryClient).not.toBe(getRouter().options.context.queryClient)
  })

  it("broadcasts cache invalidations to the other tabs of the same visitor", () => {
    const { context } = getRouter().options

    expect(sync.setupQueryClientInvalidationBroadcast).toHaveBeenCalledWith(context.queryClient)
  })

  it("does not open a browser broadcast channel during server rendering", () => {
    vi.stubEnv("SSR", true)
    const { context } = getRouter().options

    expect(context.queryClient).toBeDefined()
    expect(sync.setupQueryClientInvalidationBroadcast).not.toHaveBeenCalled()
  })
})

describe("router locale rewriting", () => {
  it("strips the locale prefix before matching a route", () => {
    expect(rewritten("input", "https://marte.test/en-US/cart")).toBe("https://marte.test/cart")
  })

  it("leaves an unprefixed path alone on the way in", () => {
    expect(rewritten("input", "https://marte.test/cart?step=2")).toBe("https://marte.test/cart?step=2")
  })

  it("puts the browsed locale back on every URL it writes", () => {
    currentRequest.mockReturnValue(new Request("https://marte.test/en-US/cart"))

    expect(rewritten("output", "https://marte.test/cart")).toBe("https://marte.test/en-US/cart")
  })

  it("writes the default locale without a prefix", () => {
    expect(rewritten("output", "https://marte.test/cart")).toBe("https://marte.test/cart")
  })
})

const CacheProbe = (): JSX.Element => <p>{String(useQueryClient().getQueryData(["greeting"]))}</p>

const wrapperOf = (router: ReturnType<typeof getRouter>) => {
  const { Wrap } = router.options

  if (Wrap === undefined) {
    throw new Error("the router registered no wrapper")
  }

  return Wrap
}

describe("router wrapper", () => {
  it.each([true, false])("includes query devtools only when development mode is %s", (development) => {
    vi.stubEnv("DEV", development)
    const Wrap = wrapperOf(getRouter())

    render(
      <Wrap>
        <p>Basket</p>
      </Wrap>,
    )

    expect(screen.getByText("Basket")).toBeInTheDocument()
    expect(devtools).toHaveBeenCalledTimes(development ? 1 : 0)
  })

  it("renders the application it is handed", () => {
    const Wrap = wrapperOf(getRouter())

    render(
      <Wrap>
        <p>Basket</p>
      </Wrap>,
    )

    expect(screen.getByText("Basket")).toBeInTheDocument()
  })

  it("reads the router cache from anywhere in the application", () => {
    const router = getRouter()
    const Wrap = wrapperOf(router)
    router.options.context.queryClient.setQueryData(["greeting"], "Basket ready")

    render(
      <Wrap>
        <CacheProbe />
      </Wrap>,
    )

    expect(screen.getByText("Basket ready")).toBeInTheDocument()
  })
})
