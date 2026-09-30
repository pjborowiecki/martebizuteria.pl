import { cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CollectionReorderCell } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collection-reorder-cell"

import { CollectionsGridHarness, collectionRow, createRowReorderApi } from "./collections-grid-harness"

const ROWS = [collectionRow()]

const HANDLE_LABEL = "Drag to reorder, or use arrow keys"

const renderCell = (rowReorder?: ReturnType<typeof createRowReorderApi>) => {
  renderWithProviders(
    <CollectionsGridHarness rowReorder={rowReorder} rows={ROWS}>
      {() => <CollectionReorderCell id="collection-1" />}
    </CollectionsGridHarness>,
  )

  return screen.getByRole("button", { name: HANDLE_LABEL })
}

describe("CollectionReorderCell", () => {
  afterEach(() => {
    cleanup()
  })

  it("is draggable while reordering is enabled", () => {
    const handle = renderCell(createRowReorderApi())

    expect(handle).toBeEnabled()
    expect(handle).toHaveAttribute("draggable", "true")
  })

  it("is disabled when the grid exposes no reordering", () => {
    const handle = renderCell()

    expect(handle).toBeDisabled()
  })

  it("is disabled when reordering is switched off", () => {
    const handle = renderCell({ ...createRowReorderApi(), enabled: false })

    expect(handle).toBeDisabled()
  })

  it("moves the row up on the arrow up key", async () => {
    const rowReorder = createRowReorderApi()
    const handle = renderCell(rowReorder)

    handle.focus()
    await userEvent.keyboard("{ArrowUp}")

    expect(rowReorder.onRowMove).toHaveBeenCalledWith("collection-1", "up")
  })

  it("moves the row down on the arrow down key", async () => {
    const rowReorder = createRowReorderApi()
    const handle = renderCell(rowReorder)

    handle.focus()
    await userEvent.keyboard("{ArrowDown}")

    expect(rowReorder.onRowMove).toHaveBeenCalledWith("collection-1", "down")
  })

  it("ignores other keys", async () => {
    const rowReorder = createRowReorderApi()
    const handle = renderCell(rowReorder)

    handle.focus()
    await userEvent.keyboard("{ArrowLeft}")

    expect(rowReorder.onRowMove).not.toHaveBeenCalled()
  })

  it("announces the dragged row id to the drag payload and the grid", () => {
    const rowReorder = createRowReorderApi()
    const handle = renderCell(rowReorder)
    const dataTransfer = { effectAllowed: "none", setData: vi.fn<(format: string, data: string) => void>() }

    fireEvent.dragStart(handle, { dataTransfer })

    expect(dataTransfer.effectAllowed).toBe("move")
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "collection-1")
    expect(rowReorder.onRowDragStart).toHaveBeenCalledWith("collection-1")
  })

  it("tells the grid the drag finished", () => {
    const rowReorder = createRowReorderApi()
    const handle = renderCell(rowReorder)

    fireEvent.dragEnd(handle)

    expect(rowReorder.onRowDrop).toHaveBeenCalledTimes(1)
  })
})
