import { act, cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CollectionsBulkActions } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-bulk-actions"

import { CollectionsGridHarness, type CollectionsTable, collectionRow } from "./collections-grid-harness"

const deleteHook = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(ids: string[], options?: { onSuccess?: () => void }) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-delete-collections", () => ({
  useDeleteCollections: () => deleteHook,
}))

const ROWS = [
  collectionRow({ id: "collection-1" }),
  collectionRow({ handle: "sale", id: "collection-2" }),
  collectionRow({ handle: "bestsellers", id: "collection-3" }),
]

const renderBulkActions = (selectedIds: readonly string[]) => {
  const seen: { table?: CollectionsTable } = {}

  renderWithProviders(
    <CollectionsGridHarness rows={ROWS}>
      {(table) => {
        seen.table = table

        return <CollectionsBulkActions />
      }}
    </CollectionsGridHarness>,
  )

  if (selectedIds.length > 0) {
    act(() => {
      seen.table?.setRowSelection(Object.fromEntries(selectedIds.map((id) => [id, true])))
    })
  }

  return seen
}

describe("CollectionsBulkActions", () => {
  beforeEach(() => {
    deleteHook.isPending = false
    deleteHook.mutate.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("stays out of the way while nothing is selected", () => {
    renderBulkActions([])

    expect(screen.queryByRole("button")).toBeNull()
  })

  it("counts the selected rows", () => {
    renderBulkActions(["collection-1", "collection-2"])

    expect(screen.getByText("2 selected")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Delete (2)" })).toBeInTheDocument()
  })

  it("asks for confirmation before deleting", async () => {
    renderBulkActions(["collection-1"])

    await userEvent.click(screen.getByRole("button", { name: "Delete (1)" }))

    expect(await screen.findByText("Delete collections?")).toBeInTheDocument()
    expect(screen.getByText("This will permanently delete 1 collection(s). This action cannot be undone.")).toBeInTheDocument()
    expect(deleteHook.mutate).not.toHaveBeenCalled()
  })

  it("deletes exactly the selected ids once confirmed", async () => {
    renderBulkActions(["collection-1", "collection-3"])

    await userEvent.click(screen.getByRole("button", { name: "Delete (2)" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(deleteHook.mutate.mock.calls[0]?.[0]).toStrictEqual(["collection-1", "collection-3"])
  })

  it("clears the selection once the deletion succeeded", async () => {
    const seen = renderBulkActions(["collection-1"])

    await userEvent.click(screen.getByRole("button", { name: "Delete (1)" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))
    act(() => {
      deleteHook.mutate.mock.calls[0]?.[1]?.onSuccess?.()
    })

    expect(seen.table?.getFilteredSelectedRowModel().rows).toHaveLength(0)
  })

  it("keeps the dialog buttons inert while the deletion is running", async () => {
    deleteHook.isPending = true
    renderBulkActions(["collection-1"])

    await userEvent.click(screen.getByRole("button", { name: "Delete (1)" }))

    expect(await screen.findByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: /^Delete$/u })).toBeDisabled()
  })

  it("leaves the selection untouched when the shopper cancels", async () => {
    const seen = renderBulkActions(["collection-1"])

    await userEvent.click(screen.getByRole("button", { name: "Delete (1)" }))
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }))

    expect(deleteHook.mutate).not.toHaveBeenCalled()
    expect(seen.table?.getFilteredSelectedRowModel().rows).toHaveLength(1)
  })
})
