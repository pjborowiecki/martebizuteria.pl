import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ProductBreadcrumb } from "~/src/presentation/components/custom/pages/product-page/product-breadcrumb"

describe("ProductBreadcrumb", () => {
  afterEach(() => {
    cleanup()
  })

  it("leads back to the home page and the catalog", () => {
    renderWithProviders(<ProductBreadcrumb productTitle="Silver ring" />)

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Products" })).toBeInTheDocument()
  })

  it("ends on the product itself, which is not a link", () => {
    renderWithProviders(<ProductBreadcrumb productTitle="Silver ring" />)

    expect(screen.getByText("Silver ring")).toHaveAttribute("aria-current", "page")
    expect(screen.queryByRole("link", { name: "Silver ring" })).toBeNull()
  })

  it("separates the three crumbs", () => {
    renderWithProviders(<ProductBreadcrumb productTitle="Silver ring" />)

    expect(screen.getAllByText("/")).toHaveLength(2)
  })
})
