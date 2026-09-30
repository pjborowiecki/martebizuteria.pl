import { cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { consumeDataGridRowClickSuppression } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"

const LABELS = {
  cancelLabel: "Keep it",
  confirmLabel: "Delete",
  description: "This removes 3 attributes.",
  title: "Delete attributes?",
}

describe("CatalogDeleteConfirmDialog", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders nothing while it is closed", () => {
    renderWithProviders(
      <CatalogDeleteConfirmDialog {...LABELS} isPending={false} onConfirm={vi.fn(() => {})} onOpenChange={vi.fn(() => {})} open={false} />,
    )

    expect(screen.queryByText("Delete attributes?")).not.toBeInTheDocument()
  })

  it("shows the title, the description and both actions when open", () => {
    renderWithProviders(
      <CatalogDeleteConfirmDialog {...LABELS} isPending={false} onConfirm={vi.fn(() => {})} onOpenChange={vi.fn(() => {})} open />,
    )

    expect(screen.getByText("Delete attributes?")).toBeInTheDocument()
    expect(screen.getByText("This removes 3 attributes.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keep it" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled()
  })

  it("confirms once when the destructive action is clicked", () => {
    const onConfirm = vi.fn(() => {})
    renderWithProviders(
      <CatalogDeleteConfirmDialog {...LABELS} isPending={false} onConfirm={onConfirm} onOpenChange={vi.fn(() => {})} open />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("disables both actions while the deletion is pending", () => {
    renderWithProviders(
      <CatalogDeleteConfirmDialog {...LABELS} isPending onConfirm={vi.fn(() => {})} onOpenChange={vi.fn(() => {})} open />,
    )

    expect(screen.getByRole("button", { name: "Keep it" })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Delete/u })).toBeDisabled()
  })

  it("does not confirm while the deletion is pending", () => {
    const onConfirm = vi.fn(() => {})
    renderWithProviders(<CatalogDeleteConfirmDialog {...LABELS} isPending onConfirm={onConfirm} onOpenChange={vi.fn(() => {})} open />)

    fireEvent.click(screen.getByRole("button", { name: /Delete/u }))

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("keeps the dialog open while the deletion is pending and escape is pressed", () => {
    const onOpenChange = vi.fn(() => {})
    renderWithProviders(<CatalogDeleteConfirmDialog {...LABELS} isPending onConfirm={vi.fn(() => {})} onOpenChange={onOpenChange} open />)

    fireEvent.keyDown(screen.getByText("Delete attributes?"), { key: "Escape" })

    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("closes on escape once the deletion is no longer pending", async () => {
    const onOpenChange = vi.fn((_open: boolean) => {})
    renderWithProviders(
      <CatalogDeleteConfirmDialog {...LABELS} isPending={false} onConfirm={vi.fn(() => {})} onOpenChange={onOpenChange} open />,
    )

    await userEvent.keyboard("{Escape}")

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("swallows the row click the dialog dismissal would otherwise trigger", async () => {
    renderWithProviders(
      <CatalogDeleteConfirmDialog {...LABELS} isPending={false} onConfirm={vi.fn(() => {})} onOpenChange={vi.fn(() => {})} open />,
    )

    await userEvent.keyboard("{Escape}")

    expect(consumeDataGridRowClickSuppression()).toBe(true)
  })
})
