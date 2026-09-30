import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"

import { type SearchResult } from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic"

import { ROUTES } from "~/src/routes"

interface OverlayLogic {
  debouncedQuery: string
  filtered: SearchResult[]
  grouped: Record<string, SearchResult[]>
  handleClearQuery: () => void
  handleClose: () => void
  handleQueryChange: () => void
  hasQuery: boolean
  hasResults: boolean
  isSearching: boolean
  query: string
  searchOpen: boolean
  showTrending: boolean
  trendingItems: StorefrontSearch["trendingItem"][]
}

const logic = vi.hoisted((): { current: OverlayLogic } => ({
  current: {
    debouncedQuery: "",
    filtered: [],
    grouped: {},
    handleClearQuery: vi.fn<() => void>(),
    handleClose: vi.fn<() => void>(),
    handleQueryChange: vi.fn<() => void>(),
    hasQuery: false,
    hasResults: false,
    isSearching: false,
    query: "",
    searchOpen: true,
    showTrending: true,
    trendingItems: [],
  },
}))

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

const defaults = (): OverlayLogic => ({
  debouncedQuery: "",
  filtered: [],
  grouped: {},
  handleClearQuery: vi.fn<() => void>(),
  handleClose: vi.fn<() => void>(),
  handleQueryChange: vi.fn<() => void>(),
  hasQuery: false,
  hasResults: false,
  isSearching: false,
  query: "",
  searchOpen: true,
  showTrending: true,
  trendingItems: [],
})

const product = (name: string, handle: string): SearchResult => ({
  detail: "Silver 925",
  image: `https://cdn.example.test/${handle}.webp`,
  name,
  params: { handle },
  to: ROUTES.PRODUCT,
  type: "product",
})

const trending = (label: string, type: StorefrontSearch["trendingType"]): StorefrontSearch["trendingItem"] => ({
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

  it("labels the overlay and marks it modal while the search is open", () => {
    renderWithProviders(<SearchOverlay />)

    const dialog = screen.getByRole("dialog", { hidden: true })

    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAttribute("aria-label", "Search")
  })

  it("labels the search field with its placeholder", () => {
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByRole("searchbox", { hidden: true, name: "Search M'ARTE…" })).toHaveValue("")
  })

  it("closes the overlay from the close control", async () => {
    renderWithProviders(<SearchOverlay />)

    await userEvent.click(screen.getByRole("button", { hidden: true, name: /Close/u }))

    expect(logic.current.handleClose).toHaveBeenCalledTimes(1)
  })

  it("lists the trending searches as links to their own route", () => {
    logic.current = { ...defaults(), trendingItems: [trending("Rings", "category"), trending("Archive", "collection")] }
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByText("Popular searches")).toBeInTheDocument()
    expect(screen.getByRole("link", { hidden: true, name: "Rings" }).getAttribute("href")).toContain("/categories/rings")
    expect(screen.getByRole("link", { hidden: true, name: "Archive" }).getAttribute("href")).toContain("/collections/archive")
  })

  it("hides the trending block once a query is being searched", () => {
    logic.current = { ...defaults(), hasQuery: true, isSearching: true, query: "rin", showTrending: false }
    renderWithProviders(<SearchOverlay />)

    expect(screen.queryByText("Popular searches")).toBeNull()
    expect(screen.getByText("Searching…")).toBeInTheDocument()
  })

  it("offers a clear control only once typing has stopped", () => {
    logic.current = { ...defaults(), hasQuery: true, isSearching: true, query: "ring", showTrending: false }
    const searching = renderWithProviders(<SearchOverlay />)

    expect(searching.container.querySelectorAll("button")).toHaveLength(1)

    cleanup()
    logic.current = { ...defaults(), hasQuery: true, query: "ring", showTrending: false }
    renderWithProviders(<SearchOverlay />)

    expect(document.querySelectorAll("button")).toHaveLength(2)
  })

  it("clears the query from the clear control", async () => {
    logic.current = { ...defaults(), hasQuery: true, query: "ring", showTrending: false }
    const { container } = renderWithProviders(<SearchOverlay />)
    const buttons = container.querySelectorAll("button")

    await userEvent.click(buttons.item(1))

    expect(logic.current.handleClearQuery).toHaveBeenCalledTimes(1)
  })

  it("tells the shopper when a finished search found nothing", () => {
    logic.current = { ...defaults(), hasQuery: true, query: "zzz", showTrending: false }
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByText("No results found")).toBeInTheDocument()
    expect(screen.getByText("Try a different term or explore our collections.")).toBeInTheDocument()
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

  it("groups the results under their translated section headings", () => {
    const products = [product("Silver ring", "silver-ring")]
    const categories: SearchResult[] = [{ name: "Rings", params: { handle: "rings" }, to: ROUTES.CATEGORY, type: "category" }]
    logic.current = {
      ...defaults(),
      debouncedQuery: "ring",
      filtered: [...products, ...categories],
      grouped: { category: categories, product: products },
      hasQuery: true,
      hasResults: true,
      query: "ring",
      showTrending: false,
    }
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByText("Products")).toBeInTheDocument()
    expect(screen.getByText("Categories")).toBeInTheDocument()
    expect(screen.getByText("Silver ring")).toBeInTheDocument()
    expect(screen.getByText("Silver 925")).toBeInTheDocument()
  })

  it("renders a thumbnail only for results that carry an image", () => {
    const withImage = product("Silver ring", "silver-ring")
    const withoutImage: SearchResult = { name: "The Maison", to: ROUTES.PRODUCTS, type: "page" }
    logic.current = {
      ...defaults(),
      debouncedQuery: "ring",
      filtered: [withImage, withoutImage],
      grouped: { page: [withoutImage], product: [withImage] },
      hasQuery: true,
      hasResults: true,
      query: "ring",
      showTrending: false,
    }
    const { container } = renderWithProviders(<SearchOverlay />)

    expect(container.querySelectorAll("img")).toHaveLength(1)
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example.test/silver-ring.webp")
  })

  it("dismisses the navigation menu and the overlay when a result is followed", async () => {
    const products = [product("Silver ring", "silver-ring")]
    logic.current = {
      ...defaults(),
      debouncedQuery: "ring",
      filtered: products,
      grouped: { product: products },
      hasQuery: true,
      hasResults: true,
      query: "ring",
      showTrending: false,
    }
    renderWithProviders(<SearchOverlay />)

    await userEvent.click(screen.getByRole("link", { hidden: true, name: /Silver ring/u }))

    expect(dismissMenu).toHaveBeenCalledTimes(1)
    expect(logic.current.handleClose).toHaveBeenCalledTimes(1)
  })

  it("offers a view all link only once the results overflow one group", () => {
    const products = Array.from({ length: 7 }, (_, index) => product(`Ring ${index}`, `ring-${index}`))
    logic.current = {
      ...defaults(),
      debouncedQuery: "ring",
      filtered: products,
      grouped: { product: products },
      hasQuery: true,
      hasResults: true,
      query: "ring",
      showTrending: false,
    }
    renderWithProviders(<SearchOverlay />)

    expect(screen.getAllByRole("link", { hidden: true, name: /Ring \d/u })).toHaveLength(6)
    expect(screen.getByRole("link", { hidden: true, name: /View all results/u }).getAttribute("href")).toContain("q=ring")
  })

  it("links a page result straight to its route under the pages heading", () => {
    const maison: SearchResult = { name: "The Maison", to: ROUTES.ABOUT, type: "page" }
    logic.current = {
      ...defaults(),
      debouncedQuery: "maison",
      filtered: [maison],
      grouped: { page: [maison] },
      hasQuery: true,
      hasResults: true,
      query: "maison",
      showTrending: false,
    }
    renderWithProviders(<SearchOverlay />)

    expect(screen.getByText("Pages")).toBeInTheDocument()
    expect(screen.getByRole("link", { hidden: true, name: /The Maison/u }).getAttribute("href")).toContain("/about")
  })

  it("omits the view all link while a single group holds every result", () => {
    const products = [product("Silver ring", "silver-ring")]
    logic.current = {
      ...defaults(),
      debouncedQuery: "ring",
      filtered: products,
      grouped: { product: products },
      hasQuery: true,
      hasResults: true,
      query: "ring",
      showTrending: false,
    }
    renderWithProviders(<SearchOverlay />)

    expect(screen.queryByRole("link", { hidden: true, name: /View all results/u })).toBeNull()
  })
})
