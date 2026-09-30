import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as SelectComponents from "~/src/presentation/components/shadcn/select"

vi.mock("~/src/presentation/components/shadcn/select", async (importOriginal) => ({
  ...(await importOriginal<typeof SelectComponents>()),
  Select: ({ onValueChange, value }: Readonly<{ onValueChange: (value: string | null) => void; value: string }>): JSX.Element => (
    <>
      <button
        onClick={() => {
          onValueChange(null)
        }}
        type="button"
      >
        Emit empty selection
      </button>
      <button
        onClick={() => {
          onValueChange("draft")
        }}
        type="button"
      >
        Choose draft
      </button>
      <output data-testid="selection">{value}</output>
    </>
  ),
}))

import { CollectionsStatusFilter } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-status-filter"

import { CollectionsGridHarness, type CollectionsTable, collectionRow } from "./collections-grid-harness"

const ROWS = [
  collectionRow({ handle: "new-arrivals", id: "collection-1", status: "active" }),
  collectionRow({ handle: "sale", id: "collection-2", status: "draft" }),
]

const renderFilter = () => {
  const seen: { table?: CollectionsTable } = {}

  renderWithProviders(
    <CollectionsGridHarness rows={ROWS}>
      {(table) => {
        seen.table = table

        return <CollectionsStatusFilter />
      }}
    </CollectionsGridHarness>,
  )

  return seen
}

const visibleHandles = (seen: { table?: CollectionsTable }) => seen.table?.getFilteredRowModel().rows.map((row) => row.original.handle)

afterEach(() => {
  cleanup()
})

describe("CollectionsStatusFilter with no selection reported", () => {
  it("leaves every collection listed when the control reports no selection", async () => {
    const seen = renderFilter()

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(visibleHandles(seen)).toStrictEqual(["new-arrivals", "sale"])
    expect(seen.table?.getColumn("status")?.getFilterValue()).toBeUndefined()
  })

  it("keeps the chosen status when the control reports no selection afterwards", async () => {
    const seen = renderFilter()

    await userEvent.click(screen.getByRole("button", { name: "Choose draft" }))
    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(visibleHandles(seen)).toStrictEqual(["sale"])
    expect(screen.getByTestId("selection")).toHaveTextContent("draft")
  })
})
