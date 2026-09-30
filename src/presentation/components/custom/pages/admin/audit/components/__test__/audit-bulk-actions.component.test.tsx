import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface MutateOptions {
  readonly onSuccess: () => void
}

const deletion = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(ids: string[], options: MutateOptions) => void>(),
}))

const grid = vi.hoisted(() => ({
  resetRowSelection: vi.fn(),
  selectedIds: [] as string[],
}))

vi.mock("~/src/presentation/components/custom/pages/admin/audit/hooks/use-delete-audit-logs", () => ({
  useDeleteAuditLogs: () => ({ isPending: deletion.isPending, mutate: deletion.mutate }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/audit/utils/audit-data-grid", () => ({
  auditDataGrid: {
    useDataGrid: () => ({
      table: {
        getFilteredSelectedRowModel: () => ({ rows: grid.selectedIds.map((id) => ({ original: { id } })) }),
        resetRowSelection: grid.resetRowSelection,
      },
    }),
  },
}))

import { AuditBulkActions } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-bulk-actions"

const openConfirm = async (): Promise<void> => {
  renderWithProviders(<AuditBulkActions />)
  await userEvent.click(screen.getByRole("button", { name: `Delete (${String(grid.selectedIds.length)})` }))
}

beforeEach(() => {
  vi.clearAllMocks()
  deletion.mutate.mockReset()
  deletion.isPending = false
  grid.selectedIds = ["audit-1", "audit-2"]
})

afterEach(cleanup)

describe("AuditBulkActions", () => {
  it("stays out of the toolbar while nothing is selected", () => {
    grid.selectedIds = []
    const { container } = renderWithProviders(<AuditBulkActions />)

    expect(container).toBeEmptyDOMElement()
  })

  it("counts the selected entries", () => {
    renderWithProviders(<AuditBulkActions />)

    expect(screen.getByText("Selected: 2")).toBeInTheDocument()
  })

  it("labels the delete trigger with the selection size", () => {
    renderWithProviders(<AuditBulkActions />)

    expect(screen.getByRole("button", { name: "Delete (2)" })).toBeInTheDocument()
  })

  it("keeps the confirmation closed until the trigger is pressed", () => {
    renderWithProviders(<AuditBulkActions />)

    expect(screen.queryByText("Delete audit log entries?")).not.toBeInTheDocument()
  })

  it("warns that the deletion cannot be undone", async () => {
    await openConfirm()

    expect(await screen.findByText("Delete audit log entries?")).toBeInTheDocument()
    expect(screen.getByText("This will permanently delete 2 audit log entries. This action cannot be undone.")).toBeInTheDocument()
  })

  it("deletes exactly the selected entry ids", async () => {
    await openConfirm()
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(deletion.mutate.mock.calls[0]?.[0]).toStrictEqual(["audit-1", "audit-2"])
  })

  it("clears the selection once the deletion succeeds", async () => {
    deletion.mutate.mockImplementation((_ids, options) => {
      options.onSuccess()
    })
    await openConfirm()
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(grid.resetRowSelection).toHaveBeenCalledTimes(1)
  })

  it("keeps the selection when the deletion never reports success", async () => {
    await openConfirm()
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(grid.resetRowSelection).not.toHaveBeenCalled()
  })

  it("deletes nothing when the admin cancels", async () => {
    await openConfirm()
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }))

    expect(deletion.mutate).not.toHaveBeenCalled()
  })

  it("locks the confirmation while the deletion is in flight", async () => {
    deletion.isPending = true
    await openConfirm()

    expect(await screen.findByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: /^Delete$/u })).toBeDisabled()
  })
})
