import { act, cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ProductsBulkActions } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-bulk-actions"

import { ProductsGridHarness, type ProductsTable, productRow } from "./products-grid-harness"

const deleteHook = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(ids: string[], options?: { onSuccess?: () => void }) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-delete-products", () => ({
  useDeleteProducts: () => deleteHook,
}))

const ROWS = [
  productRow({ id: "product-1" }),
  productRow({ handle: "gold-ring", id: "product-2" }),
  productRow({ handle: "silver-chain", id: "product-3" }),
]

const renderBulkActions = (selectedIds: readonly string[]) => {
  const seen: { table?: ProductsTable } = {}

  renderWithProviders(
    <ProductsGridHarness rows={ROWS}>
      {(table) => {
        seen.table = table

        return <ProductsBulkActions />
      }}
    </ProductsGridHarness>,
  )

  if (selectedIds.length > 0) {
    act(() => {
      seen.table?.setRowSelection(Object.fromEntries(selectedIds.map((id) => [id, true])))
    })
  }

  return seen
}

describe("ProductsBulkActions", () => {
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
    renderBulkActions(["product-1", "product-2"])

    expect(screen.getByText("2 selected")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Delete (2)" })).toBeInTheDocument()
  })

  it("asks for confirmation before deleting", async () => {
    renderBulkActions(["product-1"])

    await userEvent.click(screen.getByRole("button", { name: "Delete (1)" }))

    expect(await screen.findByText("Delete products?")).toBeInTheDocument()
    expect(
      screen.getByText("This will permanently delete 1 product(s) and their variants. This action cannot be undone."),
    ).toBeInTheDocument()
    expect(deleteHook.mutate).not.toHaveBeenCalled()
  })

  it("deletes exactly the selected ids once confirmed", async () => {
    renderBulkActions(["product-1", "product-3"])

    await userEvent.click(screen.getByRole("button", { name: "Delete (2)" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(deleteHook.mutate.mock.calls[0]?.[0]).toStrictEqual(["product-1", "product-3"])
  })

  it("clears the selection once the deletion succeeded", async () => {
    const seen = renderBulkActions(["product-1"])

    await userEvent.click(screen.getByRole("button", { name: "Delete (1)" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))
    act(() => {
      deleteHook.mutate.mock.calls[0]?.[1]?.onSuccess?.()
    })

    expect(seen.table?.getFilteredSelectedRowModel().rows).toHaveLength(0)
    expect(screen.queryByRole("button", { name: "Delete (1)" })).toBeNull()
  })

  it("keeps the dialog buttons inert while the deletion is running", async () => {
    deleteHook.isPending = true
    renderBulkActions(["product-1"])

    await userEvent.click(screen.getByRole("button", { name: "Delete (1)" }))

    expect(await screen.findByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: /^Delete$/u })).toBeDisabled()
  })

  it("leaves the selection untouched when the shopper cancels", async () => {
    const seen = renderBulkActions(["product-1"])

    await userEvent.click(screen.getByRole("button", { name: "Delete (1)" }))
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }))

    expect(deleteHook.mutate).not.toHaveBeenCalled()
    expect(seen.table?.getFilteredSelectedRowModel().rows).toHaveLength(1)
  })

  it("only counts the rows left by an active filter", () => {
    const seen = renderBulkActions(["product-1", "product-2"])
    act(() => {
      seen.table?.getColumn("handle")?.setFilterValue("gold")
    })

    expect(screen.getByText("1 selected")).toBeInTheDocument()
  })
})
