import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  CatalogToolbarAddButton,
  catalogToolbarAddButtonClassName,
} from "~/src/presentation/components/custom/pages/admin/catalog/toolbar/components/catalog-toolbar-add-button"

afterEach(cleanup)

describe("CatalogToolbarAddButton", () => {
  it("renders its children inside a non-submitting button", () => {
    renderWithProviders(<CatalogToolbarAddButton>Add product</CatalogToolbarAddButton>)

    const button = screen.getByRole("button", { name: "Add product" })

    expect(button).toHaveAttribute("type", "button")
  })

  it("carries the shared toolbar styling", () => {
    renderWithProviders(<CatalogToolbarAddButton>Add product</CatalogToolbarAddButton>)

    expect(screen.getByRole("button", { name: "Add product" })).toHaveClass(...catalogToolbarAddButtonClassName.split(" "))
  })

  it("calls the click handler once per click", async () => {
    const onClick = vi.fn<() => void>()
    renderWithProviders(<CatalogToolbarAddButton onClick={onClick}>Add product</CatalogToolbarAddButton>)

    await userEvent.click(screen.getByRole("button", { name: "Add product" }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it("renders complex children rather than flattening them to text", () => {
    renderWithProviders(
      <CatalogToolbarAddButton>
        <span data-testid="icon" />
        Add product
      </CatalogToolbarAddButton>,
    )

    expect(screen.getByTestId("icon").parentElement).toBe(screen.getByRole("button", { name: "Add product" }))
  })
})
