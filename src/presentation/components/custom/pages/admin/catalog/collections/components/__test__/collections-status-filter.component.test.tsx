import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CollectionsStatusFilter } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-status-filter"

import { CollectionsGridHarness, type CollectionsTable, collectionRow } from "./collections-grid-harness"

const ROWS = [
  collectionRow({ handle: "new-arrivals", id: "collection-1", status: "active" }),
  collectionRow({ handle: "sale", id: "collection-2", status: "draft" }),
  collectionRow({ handle: "bestsellers", id: "collection-3", status: "active" }),
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

const trigger = () => screen.getByRole("combobox", { name: "Filter by status" })

const pick = async (label: string) => {
  await userEvent.click(trigger())
  const options = await screen.findAllByRole("option")
  const target = options.find((option) => option.textContent === label)
  if (target === undefined) {
    throw new Error(`No option labelled ${label}`)
  }
  await userEvent.click(target)
}

describe("CollectionsStatusFilter", () => {
  afterEach(() => {
    cleanup()
  })

  it("starts on every status", () => {
    renderFilter()

    expect(trigger()).toHaveTextContent("All statuses")
  })

  it("narrows the table to the chosen status", async () => {
    const seen = renderFilter()

    await pick("Draft")

    expect(visibleHandles(seen)).toStrictEqual(["sale"])
  })

  it("shows the chosen status on the trigger", async () => {
    renderFilter()

    await pick("Active")

    expect(trigger()).toHaveTextContent("Active")
  })

  it("keeps only the active collections when active is chosen", async () => {
    const seen = renderFilter()

    await pick("Active")

    expect(visibleHandles(seen)).toStrictEqual(["new-arrivals", "bestsellers"])
  })

  it("clears the filter again when all statuses is chosen", async () => {
    const seen = renderFilter()

    await pick("Draft")
    await pick("All statuses")

    expect(visibleHandles(seen)).toHaveLength(ROWS.length)
    expect(seen.table?.getColumn("status")?.getFilterValue()).toBeUndefined()
  })

  it("offers exactly the three status choices", async () => {
    renderFilter()

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["All statuses", "Active", "Draft"])
  })
})
