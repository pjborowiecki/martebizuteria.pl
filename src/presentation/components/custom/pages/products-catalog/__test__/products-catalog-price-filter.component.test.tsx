import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type StorefrontProductsSearch } from "~/src/modules/product/product.storefront-catalog"

import { ProductsCatalogPriceFilter } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-price-filter"

const EMPTY_SEARCH: StorefrontProductsSearch = {}

const renderFilter = (search = EMPTY_SEARCH) => {
  const onSearchChange = vi.fn<(patch: Partial<StorefrontProductsSearch>) => void>()

  renderWithProviders(<ProductsCatalogPriceFilter onSearchChange={onSearchChange} search={search} />)

  return {
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

  it("keeps a multi digit bound the shopper types on top of the applied one", async () => {
    const { from, onSearchChange } = renderFilter({ minPrice: 25 })

    await userEvent.type(from, "0")

    expect(onSearchChange).toHaveBeenLastCalledWith({ minPrice: 250 })
  })

  it("reports the lower bound the shopper typed", async () => {
    const { from, onSearchChange } = renderFilter()

    await userEvent.type(from, "2")

    expect(onSearchChange).toHaveBeenLastCalledWith({ minPrice: 2 })
  })

  it("reports the upper bound the shopper typed", async () => {
    const { onSearchChange, to } = renderFilter()

    await userEvent.type(to, "9")

    expect(onSearchChange).toHaveBeenLastCalledWith({ maxPrice: 9 })
  })

  it("clears the lower bound when the field is emptied", async () => {
    const { from, onSearchChange } = renderFilter({ minPrice: 100 })

    await userEvent.clear(from)

    expect(onSearchChange).toHaveBeenLastCalledWith({ minPrice: undefined })
  })

  it("clears the upper bound when the field is emptied", async () => {
    const { onSearchChange, to } = renderFilter({ maxPrice: 900 })

    await userEvent.clear(to)

    expect(onSearchChange).toHaveBeenLastCalledWith({ maxPrice: undefined })
  })

  it("never reports the two bounds in one patch", async () => {
    const { from, onSearchChange } = renderFilter()

    await userEvent.type(from, "5")

    expect(onSearchChange).toHaveBeenCalledWith({ minPrice: 5 })
    expect(Object.keys(onSearchChange.mock.calls[0]?.[0] ?? {})).toStrictEqual(["minPrice"])
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
