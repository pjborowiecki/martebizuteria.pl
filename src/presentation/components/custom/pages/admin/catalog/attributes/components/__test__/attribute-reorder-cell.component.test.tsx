import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type RowMoveDirection } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

const grid = vi.hoisted(() => ({
  enabled: true,
  onRowDragStart: vi.fn<(id: string) => void>(),
  onRowDrop: vi.fn<() => void>(),
  onRowMove: vi.fn<(id: string, direction: RowMoveDirection) => void>(),
  present: true,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid", () => ({
  attributesDataGrid: {
    useDataGrid: () => ({
      rowReorder: grid.present
        ? {
            draggingId: undefined,
            enabled: grid.enabled,
            onRowDragEnter: vi.fn(),
            onRowDragStart: grid.onRowDragStart,
            onRowDrop: grid.onRowDrop,
            onRowMove: grid.onRowMove,
          }
        : undefined,
    }),
  },
}))

import { AttributeReorderCell } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attribute-reorder-cell"

const HANDLE_LABEL = "Drag to reorder, or use arrow keys"

const handle = (): HTMLElement => screen.getByRole("button", { name: HANDLE_LABEL })

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  grid.enabled = true
  grid.present = true
})

describe("AttributeReorderCell", () => {
  it("is draggable while reordering is enabled", () => {
    renderWithProviders(<AttributeReorderCell id="attribute-1" />)

    expect(handle()).toHaveAttribute("draggable", "true")
    expect(handle()).toBeEnabled()
  })

  it("is disabled while reordering is off", () => {
    grid.enabled = false
    renderWithProviders(<AttributeReorderCell id="attribute-1" />)

    expect(handle()).toBeDisabled()
  })

  it("is disabled when the grid exposes no reorder api", () => {
    grid.present = false
    renderWithProviders(<AttributeReorderCell id="attribute-1" />)

    expect(handle()).toBeDisabled()
  })

  it("announces the dragged row id as plain text", () => {
    renderWithProviders(<AttributeReorderCell id="attribute-1" />)
    const dataTransfer = { effectAllowed: "none", setData: vi.fn<(format: string, data: string) => void>() }

    fireEvent.dragStart(handle(), { dataTransfer })

    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "attribute-1")
    expect(dataTransfer.effectAllowed).toBe("move")
    expect(grid.onRowDragStart).toHaveBeenCalledWith("attribute-1")
  })

  it("ends the drag through the grid api", () => {
    renderWithProviders(<AttributeReorderCell id="attribute-1" />)

    fireEvent.dragEnd(handle())

    expect(grid.onRowDrop).toHaveBeenCalledTimes(1)
  })

  it("moves the row up on the arrow up key", () => {
    renderWithProviders(<AttributeReorderCell id="attribute-1" />)

    fireEvent.keyDown(handle(), { key: "ArrowUp" })

    expect(grid.onRowMove).toHaveBeenCalledWith("attribute-1", "up")
  })

  it("moves the row down on the arrow down key", () => {
    renderWithProviders(<AttributeReorderCell id="attribute-1" />)

    fireEvent.keyDown(handle(), { key: "ArrowDown" })

    expect(grid.onRowMove).toHaveBeenCalledWith("attribute-1", "down")
  })

  it("ignores any other key", () => {
    renderWithProviders(<AttributeReorderCell id="attribute-1" />)

    fireEvent.keyDown(handle(), { key: "Enter" })

    expect(grid.onRowMove).not.toHaveBeenCalled()
  })
})
