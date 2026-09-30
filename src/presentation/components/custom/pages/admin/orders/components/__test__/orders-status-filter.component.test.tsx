import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants"

import { renderWithOrdersGrid } from "~/src/presentation/components/custom/pages/admin/orders/components/__test__/orders-grid-harness"
import { OrdersStatusFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-status-filter"

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

afterEach(() => {
  cleanup()
})

describe("OrdersStatusFilter", () => {
  it("starts with no status filter applied", () => {
    renderWithOrdersGrid(<OrdersStatusFilter />)

    expect(trigger()).toHaveTextContent("All statuses")
  })

  it("offers every order status in lifecycle order", async () => {
    renderWithOrdersGrid(<OrdersStatusFilter />)

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual([
      "All statuses",
      "Pending",
      "Processing",
      "Completed",
      "Cancelled",
      "Refunded",
    ])
  })

  it("filters the table down to the chosen status", async () => {
    const seen = renderWithOrdersGrid(<OrdersStatusFilter />)

    await pick("Processing")

    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.getFilterValue()).toBe("processing")
    expect(seen.table?.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["order-2"])
  })

  it("shows the chosen status on the trigger", async () => {
    renderWithOrdersGrid(<OrdersStatusFilter />)

    await pick("Completed")

    expect(trigger()).toHaveTextContent("Completed")
  })

  it("clears the column filter again when all statuses is chosen", async () => {
    const seen = renderWithOrdersGrid(<OrdersStatusFilter />)

    await pick("Completed")
    await pick("All statuses")

    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.getFilterValue()).toBeUndefined()
    expect(seen.table?.getFilteredRowModel().rows).toHaveLength(3)
  })

  it("returns the table to the first page whenever the filter changes", async () => {
    const seen = renderWithOrdersGrid(<OrdersStatusFilter />)
    seen.table?.setPageIndex(2)

    await pick("Pending")

    expect(seen.table?.atoms.pagination.get().pageIndex).toBe(0)
  })
})
