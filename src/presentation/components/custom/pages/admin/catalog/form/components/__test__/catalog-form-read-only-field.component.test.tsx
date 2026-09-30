import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CatalogFormReadOnlyField } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-read-only-field"

describe("CatalogFormReadOnlyField", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the value in a read only input", () => {
    renderWithProviders(<CatalogFormReadOnlyField label="Identifier" value="cat_123" />)

    const input = screen.getByDisplayValue("cat_123")

    expect(input).toHaveAttribute("readonly")
    expect(input).toHaveAttribute("aria-readonly", "true")
  })

  it("renders the label next to the value", () => {
    renderWithProviders(<CatalogFormReadOnlyField label="Identifier" value="cat_123" />)

    expect(screen.getByText("Identifier")).toBeInTheDocument()
  })

  it("renders no hint trigger without a hint", () => {
    renderWithProviders(<CatalogFormReadOnlyField label="Identifier" value="cat_123" />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("forwards the hint to the label", () => {
    renderWithProviders(<CatalogFormReadOnlyField hint="Generated on creation." label="Identifier" value="cat_123" />)

    expect(screen.getByRole("button", { name: "Generated on creation." })).toBeInTheDocument()
  })

  it("renders an empty value without crashing", () => {
    renderWithProviders(<CatalogFormReadOnlyField label="Identifier" value="" />)

    expect(screen.getByDisplayValue("")).toBeInTheDocument()
  })
})
