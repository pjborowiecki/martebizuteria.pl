import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"

import {
  type SearchResult,
  type SearchResultGroups,
  type SearchStatus,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic"

import { ROUTES } from "~/src/routes"

interface OverlayLogic {
  browseItems: StorefrontSearch["trendingItem"][]
  grouped: SearchResultGroups
  handleClearQuery: () => void
  handleClose: () => void
  handleQueryChange: () => void
  handleRetry: () => void
  handleSubmit: (event: { preventDefault: () => void }) => void
  query: string
  results: SearchResult[]
  status: SearchStatus
  statusMessage: string
  term: string
}

const emptyGroups = (): SearchResultGroups => ({ category: [], collection: [], page: [], product: [] })

const defaults = (): OverlayLogic => ({
  browseItems: [],
  grouped: emptyGroups(),
  handleClearQuery: vi.fn<() => void>(),
  handleClose: vi.fn<() => void>(),
  handleQueryChange: vi.fn<() => void>(),
  handleRetry: vi.fn<() => void>(),
  handleSubmit: vi.fn<(event: { preventDefault: () => void }) => void>((event) => {
    event.preventDefault()
  }),
  query: "",
  results: [],
  status: "idle",
  statusMessage: "",
  term: "",
})

const logic = vi.hoisted((): { current: OverlayLogic | undefined } => ({ current: undefined }))

const dismissMenu = vi.hoisted(() => vi.fn<() => void>())

vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic", () => ({
  useSearchOverlayLogic: () => logic.current,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider", () => ({
  useNavigation: () => ({ dismissMenuForRouteNavigation: dismissMenu }),
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

const { SearchOverlay } =
  await import("~/src/presentation/components/custom/pages/landing-page/navigation/components/search/search-overlay")

const product = (name: string, handle: string): SearchResult => ({
  detail: "Silver 925",
  image: `https://cdn.example.test/${handle}.webp`,
  name,
  params: { handle },
  to: ROUTES.PRODUCT,
  type: "product",
})

const withResults = (results: SearchResult[], overrides: Partial<OverlayLogic> = {}): OverlayLogic => {
  const grouped = emptyGroups()
  for (const item of results) {
    grouped[item.type].push(item)
  }

  return {
    ...defaults(),
    grouped,
    query: "ring",
    results,
    status: "results",
    statusMessage: `${results.length} results`,
    term: "ring",
    ...overrides,
  }
}

const browse = (label: string, type: StorefrontSearch["trendingType"]): StorefrontSearch["trendingItem"] => ({
  handle: label.toLowerCase(),
  label,
  type,
})

describe("SearchOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    logic.current = defaults()
  })

  afterEach(() => {
    cleanup()
  })

  it("labels the overlay as a modal search dialog", () => {
    renderWithProviders(<SearchOverlay />)

    const dialog = screen.getByRole("dialog", { hidden: true })

    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAttribute("aria-label", "Search")
  })

  it("wraps the field in a search form that submits on enter", async () => {
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByRole("search", { hidden: true })).toBeInTheDocument()
    await userEvent.type(screen.getByRole("searchbox", { hidden: true, name: "Search M'ARTE…" }), "{Enter}")

    expect(logic.current?.handleSubmit).toHaveBeenCalledTimes(1)
  })

  it("closes the overlay from the close control and from the dialog's own cancel", async () => {
    renderWithProviders(<SearchOverlay />)

    await userEvent.click(screen.getByRole("button", { hidden: true, name: /Close/u }))
    screen.getByRole("dialog", { hidden: true }).dispatchEvent(new Event("cancel", { bubbles: false, cancelable: true }))

    expect(logic.current?.handleClose).toHaveBeenCalledTimes(2)
  })

  it("offers the browse links only while idle and only when there are any", () => {
    logic.current = { ...defaults(), browseItems: [browse("Rings", "category"), browse("Archive", "collection")] }
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByRole("heading", { hidden: true, level: 2, name: "Browse" })).toBeInTheDocument()
    expect(screen.getByRole("link", { hidden: true, name: "Rings" }).getAttribute("href")).toContain("/categories/rings")
    expect(screen.getByRole("link", { hidden: true, name: "Archive" }).getAttribute("href")).toContain("/collections/archive")

    cleanup()
    logic.current = defaults()
    renderWithProviders(<SearchOverlay />)

    expect(screen.queryByRole("heading", { hidden: true, level: 2, name: "Browse" })).toBeNull()
  })

  it("hides the browse block once a query is being searched", () => {
    logic.current = {
      ...defaults(),
      browseItems: [browse("Rings", "category")],
      query: "rin",
      status: "searching",
      statusMessage: "Searching…",
    }
    renderWithProviders(<SearchOverlay />)

    expect(screen.queryByText("Browse")).toBeNull()
    expect(screen.getByText("Searching…", { selector: "span" })).toBeInTheDocument()
  })

  it("announces the status to assistive technology", () => {
    logic.current = { ...defaults(), query: "zzz", status: "empty", statusMessage: "No results found" }
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("No results found")
  })

  it("names the clear control and clears from it once typing has settled", async () => {
    logic.current = { ...defaults(), query: "ring", status: "empty" }
    renderWithProviders(<SearchOverlay />)

    await userEvent.click(screen.getByRole("button", { hidden: true, name: "Clear search" }))

    expect(logic.current.handleClearQuery).toHaveBeenCalledTimes(1)
  })

  it("shows a spinner instead of the clear control while searching", () => {
    logic.current = { ...defaults(), query: "ring", status: "searching" }
    renderWithProviders(<SearchOverlay />)

    expect(screen.queryByRole("button", { hidden: true, name: "Clear search" })).toBeNull()
  })

  it("tells the shopper when a finished search found nothing", () => {
    logic.current = { ...defaults(), query: "zzz", status: "empty", statusMessage: "No results found" }
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByText("No results found", { selector: "p:not([role])" })).toBeInTheDocument()
    expect(screen.getByText("Try a different term or explore our collections.")).toBeInTheDocument()
  })

  it("tells the shopper when the search failed and lets them retry", async () => {
    logic.current = { ...defaults(), query: "ring", status: "error", statusMessage: "Something went wrong while searching." }
    renderWithProviders(<SearchOverlay />)

    await userEvent.click(screen.getByRole("button", { hidden: true, name: "Try again" }))

    expect(logic.current.handleRetry).toHaveBeenCalledTimes(1)
  })
})

describe("SearchOverlay results", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    logic.current = defaults()
  })

  afterEach(() => {
    cleanup()
  })

  it("groups the results under headings in a fixed order", () => {
    const category: SearchResult = { name: "Rings", params: { handle: "rings" }, to: ROUTES.CATEGORY, type: "category" }
    logic.current = withResults([category, product("Silver ring", "silver-ring")])
    renderWithProviders(<SearchOverlay />)

    const headings = screen.getAllByRole("heading", { hidden: true, level: 2 }).map((heading) => heading.textContent)

    expect(headings).toStrictEqual(["Products", "Categories"])
    expect(screen.getByText("Silver ring")).toBeInTheDocument()
    expect(screen.getByText("Silver 925")).toBeInTheDocument()
  })

  it("renders a named thumbnail only for results that carry an image", () => {
    const page: SearchResult = { name: "The Maison", to: ROUTES.ABOUT, type: "page" }
    logic.current = withResults([product("Silver ring", "silver-ring"), page])
    const { container } = renderWithProviders(<SearchOverlay />)

    expect(container.querySelectorAll("img")).toHaveLength(1)
    expect(screen.getByRole("img", { hidden: true, name: "Silver ring" })).toHaveAttribute(
      "src",
      "https://cdn.example.test/silver-ring.webp",
    )
  })

  it("dismisses the navigation menu and the overlay when a result is followed", async () => {
    logic.current = withResults([product("Silver ring", "silver-ring")])
    renderWithProviders(<SearchOverlay />)

    await userEvent.click(screen.getByRole("link", { hidden: true, name: /Silver ring/u }))

    expect(dismissMenu).toHaveBeenCalledTimes(1)
    expect(logic.current.handleClose).toHaveBeenCalledTimes(1)
  })

  it("always offers the full results page for the searched term", () => {
    logic.current = withResults([product("Silver ring", "silver-ring")])
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByRole("link", { hidden: true, name: /View all results for “ring”/u }).getAttribute("href")).toContain("q=ring")
  })

  it("keeps the previous results on screen, dimmed, while the next search runs", () => {
    logic.current = withResults([product("Silver ring", "silver-ring")], { status: "searching", statusMessage: "Searching…" })
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByText("Silver ring")).toBeInTheDocument()
    expect(screen.getByText("Silver ring").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByText("Searching…", { selector: "span" })).toBeNull()
  })
})
