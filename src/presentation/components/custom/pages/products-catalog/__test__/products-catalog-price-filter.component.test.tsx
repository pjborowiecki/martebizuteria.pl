import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, renderWithProviders } from "~/src/platform/testing/lib/render"

import { type StorefrontProductsSearch } from "~/src/modules/storefront-search/storefront-search.zod"

import { ProductsCatalogPriceFilter } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-price-filter"

const EMPTY_SEARCH: StorefrontProductsSearch = {}

const renderFilter = (search = EMPTY_SEARCH) => {
  const onSearchChange = vi.fn<(patch: Partial<StorefrontProductsSearch>) => void>()
  const { queryClient, rerender, router } = renderWithProviders(
    <ProductsCatalogPriceFilter onSearchChange={onSearchChange} search={search} />,
  )

  return {
    applySearch: (next: StorefrontProductsSearch) => {
      rerender(
        <TestProviders queryClient={queryClient} router={router}>
          <ProductsCatalogPriceFilter onSearchChange={onSearchChange} search={next} />
        </TestProviders>,
      )
    },
    from: screen.getByRole("spinbutton", { name: "From" }),
    onSearchChange,
    to: screen.getByRole("spinbutton", { name: "To" }),
  }
}

describe("ProductsCatalogPriceFilter", () => {
  afterEach(() => {
    cleanup()
  })

  it("heads the section with the translated price labels and hint", () => {
    renderFilter()

    expect(screen.getByRole("heading", { name: "Price" })).toBeInTheDocument()
    expect(screen.getByText("Amounts in PLN")).toBeInTheDocument()
  })

  it("heads the section beside the other filters, one level under the page title", () => {
    renderFilter()

    expect(screen.getByRole("heading", { level: 2, name: "Price" })).toBeInTheDocument()
  })

  it("shows the hint in the muted text colour at full strength", () => {
    renderFilter()

    expect(screen.getByText("Amounts in PLN")).toHaveClass("text-muted-foreground")
    expect(screen.getByText("Amounts in PLN").className).not.toMatch(/text-muted-foreground\//u)
  })

  it("starts both bounds empty when no price filter is applied", () => {
    const { from, to } = renderFilter()

    expect(from).toHaveValue(null)
    expect(to).toHaveValue(null)
  })

  it("shows the bounds already in the url", () => {
    const { from, to } = renderFilter({ maxPrice: 900, minPrice: 100 })

    expect(from).toHaveValue(100)
    expect(to).toHaveValue(900)
  })

  it("raises both bounds to finger-sized fields on touch screens", () => {
    const { from, to } = renderFilter()

    expect(from).toHaveClass("h-9", "pointer-coarse:h-10")
    expect(to).toHaveClass("h-9", "pointer-coarse:h-10")
  })

  it("keeps the numeric keypad on a phone", () => {
    const { from, to } = renderFilter()

    expect(from).toHaveAttribute("inputmode", "numeric")
    expect(to).toHaveAttribute("inputmode", "numeric")
  })

  it("refuses a negative bound at the field level", () => {
    const { from, to } = renderFilter()

    expect(from).toHaveAttribute("min", "0")
    expect(to).toHaveAttribute("min", "0")
  })
})

describe("ProductsCatalogPriceFilter reporting the bounds", () => {
  afterEach(() => {
    cleanup()
  })

  it("keeps a multi digit bound the shopper types on top of the applied one", async () => {
    const { from, onSearchChange } = renderFilter({ minPrice: 25 })

    await userEvent.type(from, "0")

    await waitFor(() => {
      expect(onSearchChange).toHaveBeenLastCalledWith({ minPrice: 250 })
    })
  })

  it("reports the lower bound the shopper typed", async () => {
    const { from, onSearchChange } = renderFilter()

    await userEvent.type(from, "2")

    await waitFor(() => {
      expect(onSearchChange).toHaveBeenLastCalledWith({ minPrice: 2 })
    })
  })

  it("reports the upper bound the shopper typed", async () => {
    const { onSearchChange, to } = renderFilter()

    await userEvent.type(to, "9")

    await waitFor(() => {
      expect(onSearchChange).toHaveBeenLastCalledWith({ maxPrice: 9 })
    })
  })

  it("clears the lower bound when the field is emptied", async () => {
    const { from, onSearchChange } = renderFilter({ minPrice: 100 })

    await userEvent.clear(from)

    await waitFor(() => {
      expect(onSearchChange).toHaveBeenLastCalledWith({ minPrice: undefined })
    })
  })

  it("clears the upper bound when the field is emptied", async () => {
    const { onSearchChange, to } = renderFilter({ maxPrice: 900 })

    await userEvent.clear(to)

    await waitFor(() => {
      expect(onSearchChange).toHaveBeenLastCalledWith({ maxPrice: undefined })
    })
  })

  it("never reports the two bounds in one patch", async () => {
    const { from, onSearchChange } = renderFilter()

    await userEvent.type(from, "5")

    await waitFor(() => {
      expect(onSearchChange).toHaveBeenCalledWith({ minPrice: 5 })
    })
    expect(Object.keys(onSearchChange.mock.calls[0]?.[0] ?? {})).toStrictEqual(["minPrice"])
  })
})

describe("ProductsCatalogPriceFilter while the shopper edits a bound", () => {
  afterEach(() => {
    cleanup()
  })

  it("keeps every digit the shopper types while the url has not caught up, and reports the whole amount once they pause", async () => {
    const { from, onSearchChange } = renderFilter()

    await userEvent.type(from, "150")

    expect(from).toHaveValue(150)
    expect(onSearchChange).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(onSearchChange).toHaveBeenCalledWith({ minPrice: 150 })
    })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
  })

  it("reports the amount at once when the shopper presses Enter", async () => {
    const { from, onSearchChange } = renderFilter()

    await userEvent.type(from, "150{Enter}")

    expect(onSearchChange).toHaveBeenCalledWith({ minPrice: 150 })
  })

  it("reports the amount at once when the shopper leaves the field", async () => {
    const { onSearchChange, to } = renderFilter()

    await userEvent.type(to, "900")
    await userEvent.tab()

    expect(onSearchChange).toHaveBeenCalledWith({ maxPrice: 900 })
  })

  it("reports nothing when the shopper leaves a field without changing it", async () => {
    const { from, onSearchChange } = renderFilter({ minPrice: 100 })

    await userEvent.click(from)
    await userEvent.tab()

    expect(onSearchChange).not.toHaveBeenCalled()
  })

  it("ignores a negative amount instead of applying it", async () => {
    const { from, onSearchChange } = renderFilter({ minPrice: 100 })

    await userEvent.clear(from)
    await userEvent.type(from, "-5{Enter}")

    expect(onSearchChange).toHaveBeenLastCalledWith({ minPrice: undefined })
  })

  it("shows the bound from the url again once the shopper is not editing it, so clearing the filters empties the field", async () => {
    const { applySearch, from } = renderFilter({ minPrice: 100 })

    await userEvent.click(from)
    await userEvent.tab()
    applySearch({})

    expect(from).toHaveValue(null)
  })
})
