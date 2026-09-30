import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"

interface MutateOptions {
  readonly onSuccess: () => void
}

const deletion = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(ids: string[], options: MutateOptions) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/audit/hooks/use-delete-audit-logs", () => ({
  useDeleteAuditLogs: () => ({ isPending: deletion.isPending, mutate: deletion.mutate }),
}))

import { consumeDataGridRowClickSuppression } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { AuditRowActions } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-row-actions"

const entry: AuditLog["adminListItem"] = {
  action: "product.published",
  actor: { id: "user-1", initials: "AK", name: "Anna Kowalska", role: "admin" },
  category: "catalog",
  detail: "Published Bransoletka Aurora",
  id: "audit-1",
  ip: "203.0.113.4",
  resourceId: "product-1",
  severity: "info",
  target: "Bransoletka Aurora",
  timestamp: "2026-01-15T10:00:00.000Z",
}

const renderActions = () => renderWithProviders(<AuditRowActions entry={entry} eventLabel="Product published" />)

const openMenu = async (): Promise<void> => {
  renderActions()
  const [trigger] = screen.getAllByRole("button")
  if (trigger === undefined) {
    throw new Error("the row action trigger was not rendered")
  }

  await userEvent.click(trigger)
}

beforeEach(() => {
  vi.clearAllMocks()
  deletion.isPending = false
})

afterEach(() => {
  cleanup()
})

describe("AuditRowActions menu", () => {
  it("keeps the menu closed until the trigger is pressed", () => {
    renderActions()

    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument()
  })

  it("offers deleting the entry as the only row action", async () => {
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Delete entry" })).toBeInTheDocument()
    expect(screen.getAllByRole("menuitem")).toHaveLength(1)
  })

  it("suppresses the row click so opening the menu does not open the row", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete entry" }))

    expect(consumeDataGridRowClickSuppression()).toBe(true)
  })
})

describe("AuditRowActions deletion", () => {
  it("asks for confirmation naming the event", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete entry" }))

    expect(await screen.findByText("Delete audit log entry?")).toBeInTheDocument()
    expect(
      screen.getByText("This will permanently delete the “Product published” event. This action cannot be undone."),
    ).toBeInTheDocument()
  })

  it("closes the menu once the confirmation is requested", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete entry" }))

    expect(await screen.findByText("Delete audit log entry?")).toBeInTheDocument()
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument()
  })

  it("deletes nothing until the confirmation is accepted", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete entry" }))

    expect(deletion.mutate).not.toHaveBeenCalled()
  })

  it("deletes only this entry on confirmation", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete entry" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(deletion.mutate.mock.calls[0]?.[0]).toStrictEqual(["audit-1"])
  })

  it("closes the confirmation once the deletion succeeds", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete entry" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    const options = deletion.mutate.mock.calls[0]?.[1]
    if (options === undefined) {
      throw new Error("the deletion was requested without callbacks")
    }
    options.onSuccess()

    await vi.waitFor(() => {
      expect(screen.queryByText("Delete audit log entry?")).not.toBeInTheDocument()
    })
  })

  it("abandons the deletion when the shopper cancels", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete entry" }))
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }))

    expect(deletion.mutate).not.toHaveBeenCalled()
    await vi.waitFor(() => {
      expect(screen.queryByText("Delete audit log entry?")).not.toBeInTheDocument()
    })
  })

  it("locks both confirmation buttons while the deletion is in flight", async () => {
    deletion.isPending = true

    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete entry" }))

    expect(await screen.findByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: /^Delete$/u })).toBeDisabled()
  })
})
