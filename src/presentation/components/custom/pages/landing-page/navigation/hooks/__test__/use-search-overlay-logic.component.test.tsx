import { type JSX, type SyntheticEvent, useRef } from "react"

import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"

import {
  DUR_QUICK,
  MENU_MEDIA,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-constants"
import { useSearchOverlayLogic } from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

import { ROUTES } from "~/src/routes"

const EMPTY_RESULTS: StorefrontSearch["results"] = { categories: [], collections: [], products: [] }

interface TimelineOptions {
  readonly onReverseComplete: () => void
  readonly paused: boolean
}

interface TweenTarget {
  readonly duration: number
}

interface TimelineStub {
  readonly fromTo: (target: unknown, from: object, to: TweenTarget) => TimelineStub
  readonly play: () => void
  readonly reverse: () => void
}

const animation = vi.hoisted(() => ({
  create: vi.fn<(options: TimelineOptions) => void>(),
  fromTo: vi.fn<(target: unknown, from: object, to: TweenTarget) => void>(),
  play: vi.fn<() => void>(),
  reverse: vi.fn<() => void>(),
  set: vi.fn<(target: string, vars: object) => void>(),
}))

const lenis = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }))

const remote = vi.hoisted(() => {
  const state: { failSearch: boolean; results: unknown; trending: unknown[] } = {
    failSearch: false,
    results: { categories: [], collections: [], products: [] },
    trending: [],
  }

  return { state }
})

vi.mock("~/src/integrations/gsap/gsap.config", async () => {
  const { useEffect } = await import("react")
  const timeline: TimelineStub = {
    fromTo: (target, from, to) => {
      animation.fromTo(target, from, to)

      return timeline
    },
    play: animation.play,
    reverse: animation.reverse,
  }

  return {
    gsap: {
      set: animation.set,
      timeline: (options: TimelineOptions) => {
        animation.create(options)

        return timeline
      },
    },
    useGSAP: (callback: () => void) => {
      useEffect(callback, [])
    },
  }
})
vi.mock("~/src/integrations/lenis/lenis.instance", () => ({ getLenisInstance: () => lenis }))
vi.mock("~/src/modules/storefront-search/use-cases/search-storefront", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    searchStorefrontQuery: (query: string, locale: string) =>
      queryOptions({
        queryFn: () => (remote.state.failSearch ? Promise.reject(new Error("search down")) : Promise.resolve(remote.state.results)),
        queryKey: ["storefront-search", locale, query],
      }),
  }
})
vi.mock("~/src/modules/storefront-search/use-cases/get-trending-searches", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getTrendingSearchesQuery: (locale: string) =>
      queryOptions({ queryFn: () => Promise.resolve(remote.state.trending), queryKey: ["storefront-search", "trending", locale] }),
  }
})

const SearchHarness = ({
  overlayOpen = false,
  withOverlay = true,
}: Readonly<{ overlayOpen?: boolean; withOverlay?: boolean }>): JSX.Element => {
  const overlayRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logic = useSearchOverlayLogic(overlayRef, inputRef)
  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    logic.handleSubmit(event)
  }

  return (
    <div>
      {withOverlay ? <dialog open={overlayOpen} ref={overlayRef} /> : undefined}
      <form onSubmit={submit}>
        <input aria-label="Search field" onChange={logic.handleQueryChange} ref={inputRef} value={logic.query} />
      </form>
      <button onClick={logic.handleClearQuery} type="button">
        clear
      </button>
      <button onClick={logic.handleClose} type="button">
        close
      </button>
      <button onClick={logic.handleRetry} type="button">
        retry
      </button>
      <p>{`status:${logic.status} term:${logic.term} message:${logic.statusMessage}`}</p>
      <ul aria-label="results">
        {logic.results.map((item) => (
          <li key={`${item.type}-${item.name}`}>{`${item.type} · ${item.name} · ${item.to} · ${item.params?.handle ?? "-"}`}</li>
        ))}
      </ul>
      <ul aria-label="groups">
        {Object.entries(logic.grouped)
          .filter(([, items]) => items.length > 0)
          .map(([type, items]) => (
            <li key={type}>{`${type}=${items.length}`}</li>
          ))}
      </ul>
      <ul aria-label="browse">
        {logic.browseItems.map((item) => (
          <li key={item.handle}>{`${item.type} · ${item.label}`}</li>
        ))}
      </ul>
    </div>
  )
}

const flags = () => screen.getByText(/^status:/u).textContent

const resultItems = () => screen.getAllByRole("list").find((list) => list.getAttribute("aria-label") === "results")

const field = () => screen.getByLabelText("Search field")

const revealDurations = () => animation.fromTo.mock.calls.map((call) => call[2].duration)

beforeEach(() => {
  vi.clearAllMocks()
  remote.state.failSearch = false
  remote.state.results = EMPTY_RESULTS
  remote.state.trending = []
  useNavigationStore.setState({ menuOpen: false, pendingHash: undefined, scrolled: false, searchOpen: true })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("search overlay results", () => {
  it("starts idle with nothing to show", () => {
    renderWithProviders(<SearchHarness />)

    expect(flags()).toContain("status:idle")
    expect(resultItems()?.children).toHaveLength(0)
  })

  it("stays idle for a single character instead of claiming there are no results", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "r")

    await waitFor(() => {
      expect(flags()).toContain("term:r")
    })
    expect(flags()).toContain("status:idle")
  })

  it("reports searching while the typed term is still settling", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "ring")

    expect(flags()).toContain("status:searching")
    expect(flags()).toContain("message:Searching…")
  })

  it("maps every server group onto its own storefront route and counts the hits", async () => {
    remote.state.results = {
      categories: [{ handle: "rings", name: "Rings", type: "category" }],
      collections: [{ handle: "spring", name: "Spring", type: "collection" }],
      products: [{ detail: "925 silver", handle: "silver-ring", image: "ring.jpg", name: "Silver ring", type: "product" }],
    }
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "ring")

    expect(await screen.findByText("product · Silver ring · /products/$handle · silver-ring")).toBeInTheDocument()
    expect(screen.getByText("category · Rings · /categories/$handle · rings")).toBeInTheDocument()
    expect(screen.getByText("collection · Spring · /collections/$handle · spring")).toBeInTheDocument()
    await waitFor(() => {
      expect(flags()).toContain("status:results")
    })
    expect(flags()).toContain("message:3 results")
  })

  it("groups the hits by kind", async () => {
    remote.state.results = {
      categories: [{ handle: "rings", name: "Rings", type: "category" }],
      collections: [],
      products: [
        { handle: "silver-ring", name: "Silver ring", type: "product" },
        { handle: "gold-ring", name: "Gold ring", type: "product" },
      ],
    }
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "ring")

    expect(await screen.findByText("product=2")).toBeInTheDocument()
    expect(screen.getByText("category=1")).toBeInTheDocument()
  })

  it("tells the shopper when a settled search found nothing", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "zzzz")

    await waitFor(() => {
      expect(flags()).toContain("status:empty")
    })
    expect(flags()).toContain("message:No results found")
  })

  it("reports a failed request as an error rather than as no results, and can retry", async () => {
    remote.state.failSearch = true
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "ring")

    await waitFor(() => {
      expect(flags()).toContain("status:error")
    })
    remote.state.failSearch = false
    remote.state.results = { categories: [], collections: [], products: [{ handle: "silver-ring", name: "Silver ring", type: "product" }] }
    await userEvent.click(screen.getByRole("button", { name: "retry" }))

    expect(await screen.findByText("product · Silver ring · /products/$handle · silver-ring")).toBeInTheDocument()
  })

  it("offers the static pages whose names match, folded like the catalogue", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "MAISON!")

    expect(await screen.findByText("page · The Maison · /about · -")).toBeInTheDocument()
  })

  it("links a page the server found to its route without a handle", async () => {
    remote.state.results = { categories: [], collections: [], products: [{ handle: "lookbook", name: "Lookbook", type: "page" }] }
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "look")

    expect(await screen.findByText("page · Lookbook · /products · -")).toBeInTheDocument()
  })

  it("does not offer every static page for a term made only of punctuation", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "?!")

    await waitFor(() => {
      expect(flags()).toContain("status:empty")
    })
    expect(resultItems()?.children).toHaveLength(0)
  })

  it("offers the help pages the menu links to", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "returns")

    expect(await screen.findByText("page · Shipping & returns · /exchanges-and-returns · -")).toBeInTheDocument()
  })

  it("lists the browse entries the server offers while the overlay is open", async () => {
    remote.state.trending = [
      { handle: "rings", label: "Rings", type: "category" },
      { handle: "spring", label: "Spring", type: "collection" },
    ]
    renderWithProviders(<SearchHarness />)

    expect(await screen.findByText("category · Rings")).toBeInTheDocument()
    expect(screen.getByText("collection · Spring")).toBeInTheDocument()
  })
})

describe("search overlay interaction", () => {
  it("clears the query from the clear button, keeps the overlay open and refocuses the field", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "ring")
    await userEvent.click(screen.getByRole("button", { name: "clear" }))

    expect(field()).toHaveValue("")
    expect(field()).toHaveFocus()
    expect(useNavigationStore.getState().searchOpen).toBe(true)
  })

  it("closes the overlay and forgets the query", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "ring")
    await userEvent.click(screen.getByRole("button", { name: "close" }))

    expect(useNavigationStore.getState().searchOpen).toBe(false)
    expect(field()).toHaveValue("")
  })

  it("closes the overlay on escape", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.keyboard("{Escape}")

    expect(useNavigationStore.getState().searchOpen).toBe(false)
  })

  it("toggles the overlay with the keyboard shortcut and puts the cursor in the field", async () => {
    useNavigationStore.setState({ searchOpen: false })
    renderWithProviders(<SearchHarness />)

    await userEvent.keyboard("{Meta>}k{/Meta}")

    expect(useNavigationStore.getState().searchOpen).toBe(true)
    expect(field()).toHaveFocus()
  })

  it("clears the query when the shortcut closes an open overlay", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(field(), "ring")
    await userEvent.keyboard("{Control>}k{/Control}")

    expect(useNavigationStore.getState().searchOpen).toBe(false)
    expect(field()).toHaveValue("")
  })

  it("submits a searchable term to the results page and closes", async () => {
    const router = createTestRouter()
    renderWithProviders(<SearchHarness />, { router })

    await userEvent.type(field(), "ring{Enter}")

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/products")
    })
    expect(router.state.location.search).toMatchObject({ q: "ring" })
    expect(useNavigationStore.getState().searchOpen).toBe(false)
  })

  it("ignores a submit below the search threshold", async () => {
    const router = createTestRouter()
    renderWithProviders(<SearchHarness />, { router })

    await userEvent.type(field(), "r{Enter}")

    expect(router.state.location.pathname).toBe("/")
    expect(useNavigationStore.getState().searchOpen).toBe(true)
  })
})

describe("search overlay dialog", () => {
  it("opens the dialog as a modal, stops the page from scrolling and plays the reveal", () => {
    renderWithProviders(<SearchHarness />)

    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("open")
    expect(animation.play).toHaveBeenCalledOnce()
    expect(lenis.stop).toHaveBeenCalledOnce()
    expect(animation.set).toHaveBeenCalledWith("html", { overflow: "hidden" })
  })

  it("restores scrolling and reverses the reveal when the overlay closes", () => {
    renderWithProviders(<SearchHarness />)

    act(() => {
      useNavigationStore.getState().setSearchOpen(false)
    })

    expect(animation.reverse).toHaveBeenCalledOnce()
    expect(lenis.start).toHaveBeenCalledOnce()
    expect(animation.set).toHaveBeenCalledWith("html", { clearProps: "overflow" })
  })

  it("keeps the dialog open while the reveal plays backwards and closes it once the reverse completes", () => {
    renderWithProviders(<SearchHarness />)
    const options = animation.create.mock.calls[0]?.[0]

    act(() => {
      useNavigationStore.getState().setSearchOpen(false)
    })

    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("open")

    options?.onReverseComplete()

    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open")
  })

  it("plays every step of the reveal at the quick duration when the shopper prefers reduced motion", () => {
    const reducedMotion = Object.assign(globalThis.matchMedia(MENU_MEDIA.reduced), { matches: true })
    vi.spyOn(globalThis, "matchMedia").mockReturnValue(reducedMotion)

    renderWithProviders(<SearchHarness />)

    expect(revealDurations()).toStrictEqual([DUR_QUICK, DUR_QUICK, DUR_QUICK])
  })

  it("plays the full reveal when the shopper has no motion preference", () => {
    renderWithProviders(<SearchHarness />)

    expect(revealDurations()).not.toContain(DUR_QUICK)
  })

  it("plays the reveal without reopening a dialog that is already showing", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal")
    renderWithProviders(<SearchHarness overlayOpen />)

    expect(showModal).not.toHaveBeenCalled()
    expect(animation.play).toHaveBeenCalledOnce()
  })

  it("closes when the router navigates away", async () => {
    const router = createTestRouter()
    renderWithProviders(<SearchHarness />, { router })

    await act(async () => {
      await router.navigate({ to: ROUTES.ABOUT })
    })

    expect(useNavigationStore.getState().searchOpen).toBe(false)
  })

  it("does nothing while closed and builds no timeline without a dialog", () => {
    useNavigationStore.setState({ searchOpen: false })
    renderWithProviders(<SearchHarness withOverlay={false} />)

    expect(animation.create).not.toHaveBeenCalled()
    expect(animation.play).not.toHaveBeenCalled()
    expect(lenis.stop).not.toHaveBeenCalled()
  })
})
