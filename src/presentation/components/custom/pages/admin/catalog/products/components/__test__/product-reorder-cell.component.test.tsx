import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { rowReorder } = vi.hoisted(() => ({
  rowReorder: {
    draggingId: undefined,
    enabled: true,
    onRowDragEnter: vi.fn<(overId: string) => void>(),
    onRowDragStart: vi.fn<(id: string) => void>(),
    onRowDrop: vi.fn<() => void>(),
    onRowMove: vi.fn<(id: string, direction: "up" | "down") => void>(),
  },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid", () => ({
  PRODUCTS_DATA_GRID_KEY: "admin.products",
  productsDataGrid: { useDataGrid: () => ({ rowReorder }) },
}))

import { ProductReorderCell } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/product-reorder-cell"

const HANDLE_LABEL = "Drag to reorder, or use arrow keys"

const dataTransfer = { effectAllowed: "none", setData: vi.fn<(format: string, data: string) => void>() }

beforeEach(() => {
  rowReorder.enabled = true
  rowReorder.onRowDragStart.mockReset()
  rowReorder.onRowDrop.mockReset()
  rowReorder.onRowMove.mockReset()
  dataTransfer.setData.mockReset()
  dataTransfer.effectAllowed = "none"
})

afterEach(() => {
  cleanup()
})

describe("ProductReorderCell", () => {
  it("offers a labelled drag handle while reordering is enabled", () => {
    renderWithProviders(<ProductReorderCell id="prod-1" />)
    const handle = screen.getByRole("button", { name: HANDLE_LABEL })

    expect(handle).toBeEnabled()
    expect(handle).toHaveAttribute("draggable", "true")
  })

  it("disables the handle while reordering is off", () => {
    rowReorder.enabled = false
    renderWithProviders(<ProductReorderCell id="prod-1" />)

    expect(screen.getByRole("button", { name: HANDLE_LABEL })).toBeDisabled()
  })

  it("announces the dragged row and marks the drag as a move", () => {
    renderWithProviders(<ProductReorderCell id="prod-1" />)
    fireEvent.dragStart(screen.getByRole("button", { name: HANDLE_LABEL }), { dataTransfer })

    expect(rowReorder.onRowDragStart).toHaveBeenCalledWith("prod-1")
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "prod-1")
    expect(dataTransfer.effectAllowed).toBe("move")
  })

  it("drops the row when the drag ends", () => {
    renderWithProviders(<ProductReorderCell id="prod-1" />)
    fireEvent.dragEnd(screen.getByRole("button", { name: HANDLE_LABEL }), { dataTransfer })

    expect(rowReorder.onRowDrop).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["ArrowUp", "up"],
    ["ArrowDown", "down"],
  ] as const)("moves the row %s with the keyboard", (key, direction) => {
    renderWithProviders(<ProductReorderCell id="prod-1" />)
    fireEvent.keyDown(screen.getByRole("button", { name: HANDLE_LABEL }), { key })

    expect(rowReorder.onRowMove).toHaveBeenCalledWith("prod-1", direction)
  })

  it("ignores keys that do not reorder the row", () => {
    renderWithProviders(<ProductReorderCell id="prod-1" />)
    fireEvent.keyDown(screen.getByRole("button", { name: HANDLE_LABEL }), { key: "Enter" })

    expect(rowReorder.onRowMove).not.toHaveBeenCalled()
  })
})
