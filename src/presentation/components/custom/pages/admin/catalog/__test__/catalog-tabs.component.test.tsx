import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CatalogTabs } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-tabs"

const TAB_LABELS = ["Products", "Categories", "Collections", "Attributes"]

describe("CatalogTabs", () => {
  afterEach(() => {
    cleanup()
  })

  it("links to every catalog section in a fixed order", () => {
    renderWithProviders(<CatalogTabs active="products" />)

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toStrictEqual(TAB_LABELS)
  })

  it("marks only the active section as current", () => {
    renderWithProviders(<CatalogTabs active="collections" />)

    const active = screen.getByRole("link", { name: "Collections" })
    const inactive = screen.getByRole("link", { name: "Products" })

    expect(active.className).toContain("font-medium")
    expect(inactive.className).toContain("text-muted-foreground")
  })

  it("underlines the active section only", () => {
    const { container } = renderWithProviders(<CatalogTabs active="attributes" />)

    expect(container.querySelectorAll("span.bg-foreground")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Attributes" }).querySelector("span")).not.toBeNull()
  })

  it("keeps the links pointing at their own admin routes", () => {
    renderWithProviders(<CatalogTabs active="categories" />)

    expect(screen.getByRole("link", { name: "Categories" }).getAttribute("href")).toContain("categories")
    expect(screen.getByRole("link", { name: "Collections" }).getAttribute("href")).toContain("collections")
  })
})
