import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface MutateOptions {
  readonly onSuccess: () => void
}

const grid = vi.hoisted(() => ({
  resetRowSelection: vi.fn<() => void>(),
  selected: [] as { original: { id: string } }[],
}))

const deletion = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(ids: string[], options: MutateOptions) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-delete-categories", () => ({
  useDeleteCategories: () => ({ isPending: deletion.isPending, mutate: deletion.mutate }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/utils/categories-data-grid", () => ({
  categoriesDataGrid: {
    useDataGrid: () => ({
      table: {
        getFilteredSelectedRowModel: () => ({ rows: grid.selected }),
        resetRowSelection: grid.resetRowSelection,
      },
    }),
  },
}))

import { CategoriesBulkActions } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-bulk-actions"

const openConfirm = async (): Promise<void> => {
  renderWithProviders(<CategoriesBulkActions />)
  await userEvent.click(screen.getByRole("button", { name: "Delete (2)" }))
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  deletion.isPending = false
  grid.selected = [{ original: { id: "category-1" } }, { original: { id: "category-2" } }]
})

describe("CategoriesBulkActions", () => {
  it("renders nothing while no row is selected", () => {
    grid.selected = []

    const { container } = renderWithProviders(<CategoriesBulkActions />)

    expect(container).toBeEmptyDOMElement()
  })

  it("counts the selected rows in the label and the trigger", () => {
    renderWithProviders(<CategoriesBulkActions />)

    expect(screen.getByText("2 selected")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Delete (2)" })).toBeInTheDocument()
  })

  it("asks for confirmation before deleting", async () => {
    await openConfirm()

    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Delete categories?")
    expect(await screen.findByText("This will permanently delete 2 category(ies). This action cannot be undone.")).toBeInTheDocument()
  })

  it("deletes exactly the selected ids on confirmation", async () => {
    await openConfirm()
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(deletion.mutate.mock.calls[0]?.[0]).toStrictEqual(["category-1", "category-2"])
  })

  it("clears the row selection once the deletion succeeds", async () => {
    await openConfirm()
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))
    deletion.mutate.mock.calls[0]?.[1].onSuccess()

    expect(grid.resetRowSelection).toHaveBeenCalledTimes(1)
  })

  it("disables both dialog buttons while the deletion is in flight", async () => {
    deletion.isPending = true

    await openConfirm()

    expect(await screen.findByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(await screen.findByRole("button", { name: /^Delete$/u })).toBeDisabled()
  })
})
