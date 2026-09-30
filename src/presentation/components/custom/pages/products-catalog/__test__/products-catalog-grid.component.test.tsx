import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ProductsCatalogGrid } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-grid"

vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string | null) => `cdn/${path ?? "placeholder"}` }))
vi.mock("~/src/presentation/components/custom/product-card", () => ({
  ProductCard: ({
    detail,
    image,
    name,
    priority,
    price,
    variantTitle,
  }: {
    readonly detail: string
    readonly image: string
    readonly name: string
    readonly priority: boolean
    readonly price?: string
    readonly variantTitle: string
  }) => (
    <article data-image={image} data-priority={String(priority)} data-variant-title={variantTitle}>
      <h3>{name}</h3>
      <p>{detail}</p>
      <p>{price ?? "no price"}</p>
    </article>
  ),
}))

class ObserverStub {
  disconnect(): void {
    return undefined
  }

  observe(): void {
    return undefined
  }

  unobserve(): void {
    return undefined
  }
}

const priceText = (majorUnits: number) =>
  new Intl.NumberFormat("en-US", { currency: "PLN", style: "currency" }).format(majorUnits).replaceAll(/\s/gu, " ")

const catalogProduct = (index: number, overrides: Record<string, unknown> = {}) => ({
  handle: `ring-${index}`,
  id: `product-${index}`,
  subtitles: { "en-US": `Detail ${index}`, "pl-PL": `Szczegol ${index}` },
  thumbnail: `products/ring-${index}.webp`,
  titles: { "en-US": `Ring ${index}`, "pl-PL": `Pierscionek ${index}` },
  variants: [{ id: `variant-${index}`, price: 120_000, title: "Default" }],
  ...overrides,
})

const products = (count: number) => Array.from({ length: count }, (_, index) => catalogProduct(index))

const renderGrid = (
  overrides: {
    readonly filtersActive?: boolean
    readonly products?: readonly ReturnType<typeof catalogProduct>[]
    readonly total?: number
  } = {},
) => {
  const onClearFilters = vi.fn<() => void>()
  const list = overrides.products ?? products(1)

  renderWithProviders(
    <ProductsCatalogGrid
      fetchNextPage={vi.fn<() => Promise<unknown>>(() => Promise.resolve(undefined))}
      filtersActive={overrides.filtersActive ?? false}
      hasNextPage={false}
      i18nNamespace="pages.products"
      infiniteScrollEnabled={false}
      isFetchingNextPage={false}
      onClearFilters={onClearFilters}
      products={list}
      total={overrides.total ?? list.length}
    />,
  )

  return onClearFilters
}

describe("ProductsCatalogGrid cards", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", ObserverStub)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("explains an empty result instead of showing a toolbar", () => {
    renderGrid({ products: [] })

    expect(screen.getByText("No products found.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("renders a card per product with its localized name and detail", () => {
    renderGrid({ products: products(2) })

    expect(screen.getByRole("heading", { level: 3, name: "Ring 0" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Ring 1" })).toBeInTheDocument()
    expect(screen.getByText("Detail 0")).toBeInTheDocument()
  })

  it("formats the first variant price in the shopper's locale", () => {
    renderGrid({ products: [catalogProduct(0)] })

    expect(screen.getByText(priceText(1200))).toBeInTheDocument()
  })

  it("leaves the price out for a product without variants", () => {
    renderGrid({ products: [catalogProduct(0, { variants: [] })] })

    expect(screen.getByText("no price")).toBeInTheDocument()
  })

  it("hides the placeholder variant title from the card", () => {
    renderGrid({ products: [catalogProduct(0)] })

    expect(screen.getByRole("article")).toHaveAttribute("data-variant-title", "")
  })

  it("passes a real variant title through", () => {
    renderGrid({ products: [catalogProduct(0, { variants: [{ id: "variant-0", price: 1000, title: "Gold" }] })] })

    expect(screen.getByRole("article")).toHaveAttribute("data-variant-title", "Gold")
  })

  it("prioritises the first three images only", () => {
    renderGrid({ products: products(4) })

    expect(screen.getAllByRole("article").map((card) => card.dataset["priority"])).toStrictEqual(["true", "true", "true", "false"])
  })

  it("builds the card image url from the stored thumbnail", () => {
    renderGrid({ products: [catalogProduct(0)] })

    expect(screen.getByRole("article")).toHaveAttribute("data-image", "cdn/products/ring-0.webp")
  })
})

describe("ProductsCatalogGrid toolbar", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", ObserverStub)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("counts the results the query reported, not the page", () => {
    renderGrid({ products: products(2), total: 17 })

    expect(screen.getByText("17 products")).toBeInTheDocument()
  })

  it("counts a single result in the singular", () => {
    renderGrid({ products: products(1), total: 1 })

    expect(screen.getByText("1 product")).toBeInTheDocument()
  })

  it("keeps the clear button inert while no filter is applied", async () => {
    const onClearFilters = renderGrid({ filtersActive: false })
    const clear = screen.getByRole("button", { name: "Clear filters" })

    expect(clear).toBeDisabled()

    await userEvent.click(clear)

    expect(onClearFilters).not.toHaveBeenCalled()
  })

  it("clears the filters once some are applied", async () => {
    const onClearFilters = renderGrid({ filtersActive: true })

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))

    expect(onClearFilters).toHaveBeenCalledTimes(1)
  })

  it("shows three skeleton cards while the next page loads", () => {
    const { container } = renderWithProviders(
      <ProductsCatalogGrid
        fetchNextPage={vi.fn<() => Promise<unknown>>(() => Promise.resolve(undefined))}
        filtersActive={false}
        hasNextPage
        i18nNamespace="pages.products"
        infiniteScrollEnabled
        isFetchingNextPage
        onClearFilters={vi.fn<() => void>()}
        products={products(1)}
        total={4}
      />,
    )

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(4)
  })
})
