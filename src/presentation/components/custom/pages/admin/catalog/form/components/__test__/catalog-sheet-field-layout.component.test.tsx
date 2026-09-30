import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  CatalogSheetActionColumn,
  CatalogSheetControlColumn,
  CatalogSheetControlsActionRow,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-sheet-field-layout"

describe("CatalogSheetControlColumn", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the label and its children", () => {
    renderWithProviders(
      <CatalogSheetControlColumn label="Position">
        <input aria-label="Position input" defaultValue="3" />
      </CatalogSheetControlColumn>,
    )

    expect(screen.getByText("Position")).toBeInTheDocument()
    expect(screen.getByLabelText("Position input")).toHaveValue("3")
  })

  it("forwards the counter to the label", () => {
    renderWithProviders(
      <CatalogSheetControlColumn counter="3 / 10" label="Position">
        <span>control</span>
      </CatalogSheetControlColumn>,
    )

    expect(screen.getByText("3 / 10")).toBeInTheDocument()
  })

  it("merges the extra class name onto the column", () => {
    const { container } = renderWithProviders(
      <CatalogSheetControlColumn className="w-32" label="Position">
        <span>control</span>
      </CatalogSheetControlColumn>,
    )

    expect(container.firstElementChild).toHaveClass("w-32", "flex-1")
  })

  it("forwards the hint to the label", () => {
    renderWithProviders(
      <CatalogSheetControlColumn hint="Lower values come first." label="Position">
        <span>control</span>
      </CatalogSheetControlColumn>,
    )

    expect(screen.getByRole("button", { name: "Lower values come first." })).toBeInTheDocument()
  })
})

describe("CatalogSheetControlsActionRow", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders its children in a row", () => {
    const { container } = renderWithProviders(
      <CatalogSheetControlsActionRow>
        <span>first</span>
        <span>second</span>
      </CatalogSheetControlsActionRow>,
    )

    expect(container.firstElementChild).toHaveClass("flex", "items-start")
    expect(screen.getByText("first")).toBeInTheDocument()
    expect(screen.getByText("second")).toBeInTheDocument()
  })
})

describe("CatalogSheetActionColumn", () => {
  afterEach(() => {
    cleanup()
  })

  it("reserves a hidden spacer above its children so actions align with labelled controls", () => {
    const { container } = renderWithProviders(
      <CatalogSheetActionColumn>
        <button type="button">Remove</button>
      </CatalogSheetActionColumn>,
    )

    const spacer = container.querySelector("[aria-hidden]")

    expect(spacer).toHaveClass("min-h-5")
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument()
  })
})
