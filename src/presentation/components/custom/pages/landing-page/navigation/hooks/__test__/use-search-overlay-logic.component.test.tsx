import { type JSX, useRef } from "react"

import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"

import { useSearchOverlayLogic } from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

const EMPTY_RESULTS: StorefrontSearch["results"] = { categories: [], collections: [], products: [] }

const animation = vi.hoisted(() => ({ create: vi.fn(), play: vi.fn(), reverse: vi.fn() }))

const remote = vi.hoisted(() => {
  const state: { results: unknown; trending: unknown[] } = {
    results: { categories: [], collections: [], products: [] },
    trending: [],
  }

  return { state }
})

vi.mock("~/src/integrations/gsap/gsap.config", async () => {
  const { useEffect } = await import("react")
  const timeline = {
    fromTo: () => timeline,
    play: animation.play,
    reverse: animation.reverse,
    set: () => timeline,
  }

  return {
    gsap: {
      timeline: () => {
        animation.create()

        return timeline
      },
    },
    useGSAP: (callback: () => void) => {
      useEffect(callback, [])
    },
  }
})
vi.mock("~/src/modules/storefront-search/use-cases/search-storefront", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    searchStorefrontQuery: (query: string, locale: string) =>
      queryOptions({ queryFn: () => Promise.resolve(remote.state.results), queryKey: ["storefront-search", locale, query] }),
  }
})
vi.mock("~/src/modules/storefront-search/use-cases/get-trending-searches", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getTrendingSearchesQuery: (locale: string) =>
      queryOptions({ queryFn: () => Promise.resolve(remote.state.trending), queryKey: ["storefront-search", "trending", locale] }),
  }
})

const SearchHarness = ({ withOverlay = true }: Readonly<{ withOverlay?: boolean }>): JSX.Element => {
  const overlayRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logic = useSearchOverlayLogic(overlayRef, inputRef)

  return (
    <div>
      {withOverlay ? <dialog ref={overlayRef} /> : undefined}
      <input aria-label="Search field" onChange={logic.handleQueryChange} ref={inputRef} value={logic.query} />
      <button onClick={logic.handleClearQuery} type="button">
        clear
      </button>
      <button onClick={logic.handleClose} type="button">
        close
      </button>
      <p>{`open:${String(logic.searchOpen)} hasQuery:${String(logic.hasQuery)} hasResults:${String(logic.hasResults)} trendingVisible:${String(logic.showTrending)} searching:${String(logic.isSearching)} debounced:${logic.debouncedQuery}`}</p>
      <ul aria-label="results">
        {logic.filtered.map((item) => (
          <li key={`${item.type}-${item.name}`}>{`${item.type} · ${item.name} · ${item.to} · ${item.params?.handle ?? "-"}`}</li>
        ))}
      </ul>
      <ul aria-label="groups">
        {Object.entries(logic.grouped).map(([type, items]) => (
          <li key={type}>{`${type}=${items.length}`}</li>
        ))}
      </ul>
      <ul aria-label="trending">
        {logic.trendingItems.map((item) => (
          <li key={item.handle}>{`${item.type} · ${item.label}`}</li>
        ))}
      </ul>
    </div>
  )
}

const flags = () => screen.getByText(/^open:/u).textContent

const resultItems = () => screen.getAllByRole("list").find((list) => list.getAttribute("aria-label") === "results")

beforeEach(() => {
  vi.clearAllMocks()
  remote.state.results = EMPTY_RESULTS
  remote.state.trending = []
  useNavigationStore.setState({ menuOpen: false, pendingHash: undefined, scrolled: false, searchOpen: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("search overlay results", () => {
  it("starts with an empty query, the trending list showing and nothing searching", () => {
    renderWithProviders(<SearchHarness />)

    expect(flags()).toContain("hasQuery:false")
    expect(flags()).toContain("trendingVisible:true")
    expect(flags()).toContain("searching:false")
    expect(resultItems()?.children).toHaveLength(0)
  })

  it("marks the overlay as searching while the typed query is still settling", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "ring")

    expect(flags()).toContain("hasQuery:true")
    expect(flags()).toContain("trendingVisible:false")
    expect(flags()).toContain("searching:true")
  })

  it("keeps a one-character query below the search threshold", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "r")

    await waitFor(() => {
      expect(flags()).toContain("debounced:r")
    })
    expect(flags()).toContain("hasResults:false")
    expect(resultItems()?.children).toHaveLength(0)
  })

  it("maps every server group onto its own storefront route", async () => {
    remote.state.results = {
      categories: [{ handle: "rings", name: "Rings", type: "category" }],
      collections: [{ handle: "spring", name: "Spring", type: "collection" }],
      products: [{ detail: "925 silver", handle: "silver-ring", image: "ring.jpg", name: "Silver ring", type: "product" }],
    }
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "ring")

    expect(await screen.findByText("product · Silver ring · /products/$handle · silver-ring")).toBeInTheDocument()
    expect(screen.getByText("category · Rings · /categories/$handle · rings")).toBeInTheDocument()
    expect(screen.getByText("collection · Spring · /collections/$handle · spring")).toBeInTheDocument()
  })

  it("groups the hits by kind with the products first", async () => {
    remote.state.results = {
      categories: [{ handle: "rings", name: "Rings", type: "category" }],
      collections: [],
      products: [
        { handle: "silver-ring", name: "Silver ring", type: "product" },
        { handle: "gold-ring", name: "Gold ring", type: "product" },
      ],
    }
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "ring")

    await waitFor(() => {
      expect(screen.getByText("product=2")).toBeInTheDocument()
    })
    expect(screen.getByText("category=1")).toBeInTheDocument()
    expect(screen.getByText(/hasResults:true/u)).toBeInTheDocument()
  })

  it("offers the static pages whose translated names match, without a route param", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "maison")

    expect(await screen.findByText("page · The Maison · /about · -")).toBeInTheDocument()
  })

  it("ignores punctuation and case when matching a static page", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "ALL PRODUCTS!")

    expect(await screen.findByText("page · All Products · /products · -")).toBeInTheDocument()
  })

  it("offers no page for a term that matches none of them", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "zzzz")

    await waitFor(() => {
      expect(flags()).toContain("debounced:zzzz")
    })
    expect(resultItems()?.children).toHaveLength(0)
  })

  it("offers no page for a term that is nothing but punctuation", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "!!!")

    await waitFor(() => {
      expect(flags()).toContain("debounced:!!!")
    })
    expect(resultItems()?.children).toHaveLength(0)
  })

  it("maps a page result from the server without a product handle", async () => {
    remote.state.results = {
      categories: [],
      collections: [],
      products: [{ handle: "", name: "Browse jewellery", type: "page" }],
    }
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "jewellery")

    expect(await screen.findByText("page · Browse jewellery · /products · -")).toBeInTheDocument()
    expect(screen.getByText("page=1")).toBeInTheDocument()
  })

  it("lists the trending entries the server offers while the overlay is open", async () => {
    const trending: StorefrontSearch["trendingItem"][] = [
      { handle: "rings", label: "Rings", type: "category" },
      { handle: "spring", label: "Spring", type: "collection" },
    ]
    remote.state.trending = trending
    renderWithProviders(<SearchHarness />)

    expect(await screen.findByText("category · Rings")).toBeInTheDocument()
    expect(screen.getByText("collection · Spring")).toBeInTheDocument()
  })
})

describe("search overlay interaction", () => {
  it("clears the query from the clear button but leaves the overlay open", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "ring")
    await userEvent.click(screen.getByRole("button", { name: "clear" }))

    expect(screen.getByLabelText("Search field")).toHaveValue("")
    expect(useNavigationStore.getState().searchOpen).toBe(true)
  })

  it("closes the overlay and forgets the query", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "ring")
    await userEvent.click(screen.getByRole("button", { name: "close" }))

    expect(useNavigationStore.getState().searchOpen).toBe(false)
    expect(screen.getByLabelText("Search field")).toHaveValue("")
  })

  it("closes the overlay on escape", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.keyboard("{Escape}")

    expect(useNavigationStore.getState().searchOpen).toBe(false)
  })

  it("leaves a closed overlay closed on escape", async () => {
    useNavigationStore.setState({ searchOpen: false })
    renderWithProviders(<SearchHarness />)

    await userEvent.keyboard("{Escape}")

    expect(useNavigationStore.getState().searchOpen).toBe(false)
  })

  it("toggles the overlay with the keyboard shortcut", async () => {
    useNavigationStore.setState({ searchOpen: false })
    renderWithProviders(<SearchHarness />)

    await userEvent.keyboard("{Meta>}k{/Meta}")

    expect(useNavigationStore.getState().searchOpen).toBe(true)
  })

  it("puts the cursor in the search field shortly after the overlay opens", async () => {
    useNavigationStore.setState({ searchOpen: false })
    renderWithProviders(<SearchHarness />)

    await userEvent.keyboard("{Meta>}k{/Meta}")

    await waitFor(
      () => {
        expect(screen.getByLabelText("Search field")).toHaveFocus()
      },
      { timeout: 2000 },
    )
  })

  it("clears the query when the shortcut closes an open overlay", async () => {
    renderWithProviders(<SearchHarness />)

    await userEvent.type(screen.getByLabelText("Search field"), "ring")
    await userEvent.keyboard("{Control>}k{/Control}")

    expect(useNavigationStore.getState().searchOpen).toBe(false)
    expect(screen.getByLabelText("Search field")).toHaveValue("")
  })
})

describe("search overlay animation lifecycle", () => {
  it("creates its timeline after the dialog mounts and reverses it while closed", () => {
    useNavigationStore.setState({ searchOpen: false })
    renderWithProviders(<SearchHarness />)

    expect(animation.create).toHaveBeenCalledOnce()
    expect(animation.reverse).toHaveBeenCalledOnce()
    expect(animation.play).not.toHaveBeenCalled()
  })

  it("does not build a timeline before the dialog exists", () => {
    renderWithProviders(<SearchHarness withOverlay={false} />)

    expect(animation.create).not.toHaveBeenCalled()
    expect(animation.play).not.toHaveBeenCalled()
    expect(animation.reverse).not.toHaveBeenCalled()
  })

  it("cancels delayed focus if the overlay closes during its opening animation", async () => {
    vi.useFakeTimers()
    renderWithProviders(<SearchHarness />)
    const focus = vi.spyOn(screen.getByLabelText("Search field"), "focus")
    expect(animation.play).toHaveBeenCalledOnce()

    act(() => {
      useNavigationStore.getState().setSearchOpen(false)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(animation.reverse).toHaveBeenCalledOnce()
    expect(focus).not.toHaveBeenCalled()
  })

  it("cancels delayed focus and keyboard shortcuts when unmounted", async () => {
    vi.useFakeTimers()
    const { unmount } = renderWithProviders(<SearchHarness />)
    const focus = vi.spyOn(screen.getByLabelText("Search field"), "focus")

    unmount()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(focus).not.toHaveBeenCalled()
    expect(useNavigationStore.getState().searchOpen).toBe(true)
  })
})
