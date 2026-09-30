import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Sheet } from "~/src/presentation/components/shadcn/sheet"

import {
  PRODUCT_FORM_SHEET_RESIZE_KEY,
  PRODUCT_SHEET_DEFAULT_WIDTH_PX,
  ProductFormSheetContent,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-form-sheet-content"

const STORAGE_PREFIX = "admin-sheet-width:"

const renderSheet = () =>
  renderWithProviders(
    <Sheet open>
      <ProductFormSheetContent>
        <span>Product form</span>
      </ProductFormSheetContent>
    </Sheet>,
  )

const prepareHandle = (holdsCapture: boolean) => {
  const handle = screen.getByRole("button", { name: "Resize panel" })
  const releasePointerCapture = vi.fn<(pointerId: number) => void>()
  handle.setPointerCapture = vi.fn<(pointerId: number) => void>()
  handle.releasePointerCapture = releasePointerCapture
  handle.hasPointerCapture = vi.fn<(pointerId: number) => boolean>(() => holdsCapture)

  return { handle, releasePointerCapture }
}

const panelOf = (): HTMLElement => {
  const panel = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')
  if (panel === null) {
    throw new Error("expected the sheet panel to be rendered")
  }

  return panel
}

describe("ProductFormSheetContent", () => {
  beforeEach(() => {
    localStorage.clear()
    window.innerWidth = 3000
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it("renders the product form behind a labelled resize handle", () => {
    renderSheet()

    expect(screen.getByText("Product form")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Resize panel" })).toBeInTheDocument()
  })

  it("opens at the wide product default rather than the shared sheet default", () => {
    renderSheet()

    expect(panelOf().style.width).toBe(`${PRODUCT_SHEET_DEFAULT_WIDTH_PX}px`)
    expect(panelOf().style.minWidth).toBe(`${PRODUCT_SHEET_DEFAULT_WIDTH_PX}px`)
  })

  it("reopens at the width stored under its own key", () => {
    localStorage.setItem(`${STORAGE_PREFIX}${PRODUCT_FORM_SHEET_RESIZE_KEY}`, "1500")

    renderSheet()

    expect(panelOf().style.width).toBe("1500px")
  })

  it("ignores a stored width narrower than the product default", () => {
    localStorage.setItem(`${STORAGE_PREFIX}${PRODUCT_FORM_SHEET_RESIZE_KEY}`, "600")

    renderSheet()

    expect(panelOf().style.width).toBe(`${PRODUCT_SHEET_DEFAULT_WIDTH_PX}px`)
  })

  it("never opens wider than the product cap", () => {
    localStorage.setItem(`${STORAGE_PREFIX}${PRODUCT_FORM_SHEET_RESIZE_KEY}`, "9000")

    renderSheet()

    expect(panelOf().style.width).toBe("2560px")
  })

  it("keeps the panel within the viewport ratio on a narrow screen", () => {
    window.innerWidth = 1500
    localStorage.setItem(`${STORAGE_PREFIX}${PRODUCT_FORM_SHEET_RESIZE_KEY}`, "9000")

    renderSheet()

    expect(panelOf().style.width).toBe("1470px")
  })

  it("ignores a resize started with a secondary mouse button", () => {
    renderSheet()

    fireEvent.pointerDown(screen.getByRole("button", { name: "Resize panel" }), { button: 1, clientX: 400, pointerId: 1 })

    expect(document.body.style.cursor).toBe("")
  })

  it("widens the panel while the handle is dragged left", () => {
    renderSheet()
    const handle = screen.getByRole("button", { name: "Resize panel" })
    handle.setPointerCapture = vi.fn<(pointerId: number) => void>()

    fireEvent.pointerDown(handle, { button: 0, clientX: 800, pointerId: 1 })
    fireEvent.pointerMove(document, { clientX: 600, pointerId: 1 })

    expect(document.body.style.cursor).toBe("col-resize")
    expect(panelOf().style.width).toBe(`${PRODUCT_SHEET_DEFAULT_WIDTH_PX + 200}px`)
  })

  it("keeps the width the drag ended on and remembers it for next time", () => {
    renderSheet()
    const { handle } = prepareHandle(true)

    fireEvent.pointerDown(handle, { button: 0, clientX: 800, pointerId: 2 })
    fireEvent.pointerUp(document, { clientX: 600, pointerId: 2 })

    expect(panelOf().style.width).toBe(`${PRODUCT_SHEET_DEFAULT_WIDTH_PX + 200}px`)
    expect(localStorage.getItem(`${STORAGE_PREFIX}${PRODUCT_FORM_SHEET_RESIZE_KEY}`)).toBe(String(PRODUCT_SHEET_DEFAULT_WIDTH_PX + 200))
    expect(document.body.style.cursor).toBe("")
  })

  it("hands the pointer back to the page when the drag ends", () => {
    renderSheet()
    const { handle, releasePointerCapture } = prepareHandle(true)

    fireEvent.pointerDown(handle, { button: 0, clientX: 800, pointerId: 3 })
    fireEvent.pointerUp(document, { clientX: 700, pointerId: 3 })

    expect(releasePointerCapture).toHaveBeenCalledWith(3)
  })

  it("stores the width even when the handle no longer holds the pointer", () => {
    renderSheet()
    const { handle, releasePointerCapture } = prepareHandle(false)

    fireEvent.pointerDown(handle, { button: 0, clientX: 800, pointerId: 4 })
    fireEvent.pointerUp(document, { clientX: 700, pointerId: 4 })

    expect(releasePointerCapture).not.toHaveBeenCalled()
    expect(localStorage.getItem(`${STORAGE_PREFIX}${PRODUCT_FORM_SHEET_RESIZE_KEY}`)).toBe(String(PRODUCT_SHEET_DEFAULT_WIDTH_PX + 100))
  })

  it("never stores a width narrower than the product minimum", () => {
    renderSheet()
    const { handle } = prepareHandle(true)

    fireEvent.pointerDown(handle, { button: 0, clientX: 800, pointerId: 5 })
    fireEvent.pointerUp(document, { clientX: 1200, pointerId: 5 })

    expect(panelOf().style.width).toBe(`${PRODUCT_SHEET_DEFAULT_WIDTH_PX}px`)
    expect(localStorage.getItem(`${STORAGE_PREFIX}${PRODUCT_FORM_SHEET_RESIZE_KEY}`)).toBe(String(PRODUCT_SHEET_DEFAULT_WIDTH_PX))
  })
})
