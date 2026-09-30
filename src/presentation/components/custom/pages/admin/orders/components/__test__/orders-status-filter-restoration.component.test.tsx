import { act, cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants"

import { renderWithOrdersGrid } from "~/src/presentation/components/custom/pages/admin/orders/components/__test__/orders-grid-harness"
import { OrdersStatusFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-status-filter"

afterEach(cleanup)

describe("restored order status filters", () => {
  it("preserves a restored filter and page when the menu is dismissed", async () => {
    const seen = renderWithOrdersGrid(<OrdersStatusFilter />)
    act(() => {
      seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.setFilterValue("processing")
      seen.table?.setPageIndex(2)
    })

    await userEvent.click(screen.getByRole("combobox", { name: "Filter by status" }))
    expect(await screen.findByRole("option", { name: "Processing" })).toHaveAttribute("aria-selected", "true")
    await userEvent.keyboard("{Escape}")

    expect(screen.getByRole("combobox", { name: "Filter by status" })).toHaveAttribute("aria-expanded", "false")
    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.getFilterValue()).toBe("processing")
    expect(seen.table?.atoms.pagination.get().pageIndex).toBe(2)
    expect(seen.table?.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["order-2"])
  })

  it("recovers from an obsolete persisted status when an administrator chooses a valid status", async () => {
    const seen = renderWithOrdersGrid(<OrdersStatusFilter />)
    act(() => {
      seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.setFilterValue("archived")
      seen.table?.setPageIndex(2)
    })
    expect(seen.table?.getFilteredRowModel().rows).toHaveLength(0)

    await userEvent.click(screen.getByRole("combobox", { name: "Filter by status" }))
    await userEvent.click(await screen.findByRole("option", { name: "Completed" }))

    expect(screen.getByRole("combobox", { name: "Filter by status" })).toHaveTextContent("Completed")
    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.status)?.getFilterValue()).toBe("completed")
    expect(seen.table?.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["order-3"])
    expect(seen.table?.atoms.pagination.get().pageIndex).toBe(0)
  })
})
