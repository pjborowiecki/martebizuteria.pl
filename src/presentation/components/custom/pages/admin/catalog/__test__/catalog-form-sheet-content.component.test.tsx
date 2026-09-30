import { type ReactNode } from "react"

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Sheet } from "~/src/presentation/components/shadcn/sheet"

import {
  CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX,
  CATALOG_FORM_SHEET_RESIZE_KEY,
  CatalogFormSheetContent,
} from "~/src/presentation/components/custom/pages/admin/catalog/catalog-form-sheet-content"

const STORAGE_PREFIX = "admin-sheet-width:"

const storedWidth = (key: string): string | null => localStorage.getItem(`${STORAGE_PREFIX}${key}`)

const renderSheet = (children: ReactNode = <span>Collection form</span>) =>
  renderWithProviders(
    <Sheet open>
      <CatalogFormSheetContent>{children}</CatalogFormSheetContent>
    </Sheet>,
  )

const panelOf = (): HTMLElement => {
  const panel = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')
  if (panel === null) {
    throw new Error("expected the sheet panel to be rendered")
  }

  return panel
}

describe("CatalogFormSheetContent", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it("renders the form it wraps behind a labelled resize handle", () => {
    renderSheet()

    expect(screen.getByText("Collection form")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Resize panel" })).toBeInTheDocument()
  })

  it("opens at the shared default width when nothing has been stored", () => {
    renderSheet()

    expect(panelOf().style.width).toBe(`${CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX}px`)
  })

  it("reopens at the width the admin last chose", () => {
    localStorage.setItem(`${STORAGE_PREFIX}${CATALOG_FORM_SHEET_RESIZE_KEY}`, "700")

    renderSheet()

    expect(panelOf().style.width).toBe("700px")
  })

  it("adopts a width stored under a legacy sheet key and migrates it forward", () => {
    localStorage.setItem(`${STORAGE_PREFIX}admin.catalog.collection-sheet`, "820")

    renderSheet()

    expect(panelOf().style.width).toBe("820px")
    expect(storedWidth(CATALOG_FORM_SHEET_RESIZE_KEY)).toBe("820")
  })

  it("prefers its own stored width over a legacy one", () => {
    localStorage.setItem(`${STORAGE_PREFIX}${CATALOG_FORM_SHEET_RESIZE_KEY}`, "640")
    localStorage.setItem(`${STORAGE_PREFIX}admin.catalog.category-sheet`, "900")

    renderSheet()

    expect(panelOf().style.width).toBe("640px")
  })

  it("never opens narrower than the default width", () => {
    localStorage.setItem(`${STORAGE_PREFIX}${CATALOG_FORM_SHEET_RESIZE_KEY}`, "120")

    renderSheet()

    expect(panelOf().style.width).toBe(`${CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX}px`)
  })

  it("ignores a resize started with a secondary mouse button", () => {
    renderSheet()

    fireEvent.pointerDown(screen.getByRole("button", { name: "Resize panel" }), { button: 2, clientX: 400, pointerId: 1 })

    expect(document.body.style.cursor).toBe("")
  })

  it("widens the panel while the handle is dragged left and clamps it at the default width", () => {
    renderSheet()
    const handle = screen.getByRole("button", { name: "Resize panel" })
    handle.setPointerCapture = vi.fn<(pointerId: number) => void>()

    fireEvent.pointerDown(handle, { button: 0, clientX: 400, pointerId: 1 })

    expect(document.body.style.cursor).toBe("col-resize")

    fireEvent.pointerMove(document, { clientX: 300, pointerId: 1 })

    expect(panelOf().style.width).toBe(`${CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX + 100}px`)
    expect(storedWidth(CATALOG_FORM_SHEET_RESIZE_KEY)).toBeNull()

    fireEvent.pointerMove(document, { clientX: 900, pointerId: 1 })

    expect(panelOf().style.width).toBe(`${CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX}px`)
  })

  it("keeps the dragged width and stores it once the pointer is released", () => {
    renderSheet()
    const handle = screen.getByRole("button", { name: "Resize panel" })
    const releasePointerCapture = vi.fn<(pointerId: number) => void>()
    handle.setPointerCapture = vi.fn<(pointerId: number) => void>()
    handle.hasPointerCapture = vi.fn<(pointerId: number) => boolean>(() => true)
    handle.releasePointerCapture = releasePointerCapture

    fireEvent.pointerDown(handle, { button: 0, clientX: 400, pointerId: 21 })
    fireEvent.pointerMove(document, { clientX: 300, pointerId: 21 })
    fireEvent.pointerUp(document, { clientX: 300, pointerId: 21 })

    expect(panelOf().style.width).toBe(`${CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX + 100}px`)
    expect(storedWidth(CATALOG_FORM_SHEET_RESIZE_KEY)).toBe(String(CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX + 100))
    expect(releasePointerCapture).toHaveBeenCalledWith(21)
    expect(document.body.style.cursor).toBe("")
  })

  it("reopens at the width the admin dragged to", () => {
    renderSheet()
    const handle = screen.getByRole("button", { name: "Resize panel" })
    handle.setPointerCapture = vi.fn<(pointerId: number) => void>()
    handle.hasPointerCapture = vi.fn<(pointerId: number) => boolean>(() => true)
    handle.releasePointerCapture = vi.fn<(pointerId: number) => void>()
    fireEvent.pointerDown(handle, { button: 0, clientX: 400, pointerId: 21 })
    fireEvent.pointerUp(document, { clientX: 260, pointerId: 21 })
    cleanup()

    renderSheet()

    expect(panelOf().style.width).toBe(`${CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX + 140}px`)
  })

  it("stores the width even when the browser already dropped the pointer capture", () => {
    renderSheet()
    const handle = screen.getByRole("button", { name: "Resize panel" })
    const releasePointerCapture = vi.fn<(pointerId: number) => void>()
    handle.setPointerCapture = vi.fn<(pointerId: number) => void>()
    handle.hasPointerCapture = vi.fn<(pointerId: number) => boolean>(() => false)
    handle.releasePointerCapture = releasePointerCapture

    fireEvent.pointerDown(handle, { button: 0, clientX: 400, pointerId: 21 })
    fireEvent.pointerUp(document, { clientX: 300, pointerId: 21 })

    expect(releasePointerCapture).not.toHaveBeenCalled()
    expect(storedWidth(CATALOG_FORM_SHEET_RESIZE_KEY)).toBe(String(CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX + 100))
  })

  it("ignores pointer moves that belong to another pointer", () => {
    renderSheet()
    const handle = screen.getByRole("button", { name: "Resize panel" })
    handle.setPointerCapture = vi.fn<(pointerId: number) => void>()

    fireEvent.pointerDown(handle, { button: 0, clientX: 400, pointerId: 1 })
    fireEvent.pointerMove(document, { clientX: 100, pointerId: 9 })

    expect(panelOf().style.width).toBe(`${CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX}px`)
  })
})
