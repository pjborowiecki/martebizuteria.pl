import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ProductsCatalogMobileFilters } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-mobile-filters"

const renderMobileFilters = (props: { readonly activeFilterCount?: number; readonly open?: boolean } = {}) => {
  const handlers = {
    onClose: vi.fn<() => void>(),
    onOpenChange: vi.fn<(open: boolean, details?: unknown) => void>(),
  }

  renderWithProviders(
    <ProductsCatalogMobileFilters
      activeFilterCount={props.activeFilterCount ?? 0}
      onClose={handlers.onClose}
      onOpenChange={handlers.onOpenChange}
      open={props.open ?? false}
    >
      <p>Filter body</p>
    </ProductsCatalogMobileFilters>,
  )

  return handlers
}

describe("ProductsCatalogMobileFilters", () => {
  afterEach(() => {
    cleanup()
  })

  it("offers a trigger that names the panel", () => {
    renderMobileFilters()

    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument()
  })

  it("hides the badge while no filter is applied", () => {
    renderMobileFilters()

    expect(screen.getByRole("button", { name: "Filters" }).textContent).toBe("Filters")
  })

  it("counts the applied filters on the trigger", () => {
    renderMobileFilters({ activeFilterCount: 3 })

    expect(screen.getByRole("button", { name: /Filters/u }).textContent).toBe("Filters3")
  })

  it("keeps the panel content out of the page while closed", () => {
    renderMobileFilters()

    expect(screen.queryByText("Filter body")).toBeNull()
  })

  it("shows the heading and the children once open", () => {
    renderMobileFilters({ open: true })

    expect(screen.getByText("Refine your selection")).toBeInTheDocument()
    expect(screen.getByText("Filters", { selector: "p" })).toBeInTheDocument()
    expect(screen.getByText("Filter body")).toBeInTheDocument()
  })

  it("asks to open when the trigger is tapped", async () => {
    const handlers = renderMobileFilters()

    await userEvent.click(screen.getByRole("button", { name: "Filters" }))

    expect(handlers.onOpenChange.mock.calls[0]?.[0]).toBe(true)
  })

  it("closes the panel from its footer button", async () => {
    const handlers = renderMobileFilters({ open: true })

    await userEvent.click(screen.getByRole("button", { name: "Show results" }))

    expect(handlers.onClose).toHaveBeenCalledTimes(1)
  })
})
