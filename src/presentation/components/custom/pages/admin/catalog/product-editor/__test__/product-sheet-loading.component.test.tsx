import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Sheet, SheetContent } from "~/src/presentation/components/shadcn/sheet"

import {
  ProductSheetFormSkeleton,
  ProductSheetLoading,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet-loading"

afterEach(cleanup)

const skeletonsIn = (root: HTMLElement): number => root.querySelectorAll('[data-slot="skeleton"]').length

const renderLoading = () =>
  renderWithProviders(
    <Sheet open>
      <SheetContent>
        <ProductSheetLoading description="Create a new product." title="New product" />
      </SheetContent>
    </Sheet>,
  )

describe("ProductSheetLoading", () => {
  it("shows the title and description it is given", () => {
    renderLoading()

    expect(screen.getByText("New product")).toBeInTheDocument()
    expect(screen.getByText("Create a new product.")).toBeInTheDocument()
  })

  it("marks the placeholder body as busy for assistive technology", () => {
    renderLoading()

    const busy = screen.getByLabelText("Loading...")

    expect(busy).toHaveAttribute("aria-busy", "true")
  })

  it("puts the skeleton form inside the busy region", () => {
    renderLoading()

    expect(skeletonsIn(screen.getByLabelText("Loading..."))).toBeGreaterThan(0)
  })

  it("keeps a footer skeleton outside the busy region so the sheet keeps its shape", () => {
    renderLoading()
    const total = document.querySelectorAll('[data-slot="skeleton"]').length

    expect(total).toBeGreaterThan(skeletonsIn(screen.getByLabelText("Loading...")))
  })

  it("offers no form control while loading, only the sheet's own close button", () => {
    renderLoading()

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toStrictEqual(["Close"])
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
  })
})

describe("ProductSheetFormSkeleton", () => {
  it("stands in for every section of the product form", () => {
    const { container } = renderWithProviders(<ProductSheetFormSkeleton />)

    expect(skeletonsIn(container)).toBe(45)
  })

  it("renders no text of its own", () => {
    const { container } = renderWithProviders(<ProductSheetFormSkeleton />)

    expect(container.textContent).toBe("")
  })
})
