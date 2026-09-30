import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface FooterContext {
  dismiss: Mock<() => void>
  isPending: boolean
  isUploading: boolean
  mode: "create" | "edit"
}

const { context } = vi.hoisted(
  (): {
    context: FooterContext
  } => ({ context: { dismiss: vi.fn<() => void>(), isPending: false, isUploading: false, mode: "create" } }),
)

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-provider", () => ({
  PRODUCT_FORM_ID: "product-form",
  useProductForm: () => context,
}))

import { ProductSheetFooter } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-sheet-footer"

afterEach(cleanup)

beforeEach(() => {
  context.dismiss.mockReset()
  context.isPending = false
  context.isUploading = false
  context.mode = "create"
})

describe("ProductSheetFooter", () => {
  it("offers to create the product while adding a new one", () => {
    renderWithProviders(<ProductSheetFooter />)

    expect(screen.getByRole("button", { name: "Create product" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled()
  })

  it("offers to save changes while editing", () => {
    context.mode = "edit"
    renderWithProviders(<ProductSheetFooter />)

    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
  })

  it("submits the shared product form rather than a nested one", () => {
    renderWithProviders(<ProductSheetFooter />)

    expect(screen.getByRole("button", { name: "Create product" })).toHaveAttribute("form", "product-form")
  })

  it("locks both buttons while the product is being saved", () => {
    context.isPending = true
    renderWithProviders(<ProductSheetFooter />)

    expect(screen.getByRole("button", { name: "Create product" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
  })

  it("blocks saving while an image is still uploading but keeps cancel available", () => {
    context.isUploading = true
    renderWithProviders(<ProductSheetFooter />)

    expect(screen.getByRole("button", { name: "Create product" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled()
  })

  it("dismisses the sheet from the cancel button", async () => {
    renderWithProviders(<ProductSheetFooter />)

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(context.dismiss).toHaveBeenCalledTimes(1)
  })
})
