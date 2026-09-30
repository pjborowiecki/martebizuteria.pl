import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_TABLE_COLUMN_ID } from "~/src/modules/order/order.constants"

import { renderWithOrdersGrid } from "~/src/presentation/components/custom/pages/admin/orders/components/__test__/orders-grid-harness"
import { OrdersFulfillmentFilter } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-fulfillment-filter"

const trigger = () => screen.getByRole("combobox", { name: "Filter by fulfillment" })

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

describe("OrdersFulfillmentFilter", () => {
  it("starts with no fulfillment filter applied", () => {
    renderWithOrdersGrid(<OrdersFulfillmentFilter />)

    expect(trigger()).toHaveTextContent("All fulfillment")
  })

  it("offers every fulfillment stage in workflow order", async () => {
    renderWithOrdersGrid(<OrdersFulfillmentFilter />)

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual([
      "All fulfillment",
      "Unfulfilled",
      "Pending",
      "Shipped",
      "Delivered",
      "Returned",
    ])
  })

  it("filters the table down to the chosen stage", async () => {
    const seen = renderWithOrdersGrid(<OrdersFulfillmentFilter />)

    await pick("Shipped")

    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment)?.getFilterValue()).toBe(ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED)
    expect(seen.table?.getFilteredRowModel().rows.map((row) => row.id)).toStrictEqual(["order-2"])
  })

  it("shows the chosen stage on the trigger", async () => {
    renderWithOrdersGrid(<OrdersFulfillmentFilter />)

    await pick("Delivered")

    expect(trigger()).toHaveTextContent("Delivered")
  })

  it("clears the column filter again when all fulfillment is chosen", async () => {
    const seen = renderWithOrdersGrid(<OrdersFulfillmentFilter />)

    await pick("Delivered")
    await pick("All fulfillment")

    expect(seen.table?.getColumn(ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment)?.getFilterValue()).toBeUndefined()
    expect(seen.table?.getFilteredRowModel().rows).toHaveLength(3)
  })

  it("returns the table to the first page whenever the filter changes", async () => {
    const seen = renderWithOrdersGrid(<OrdersFulfillmentFilter />)
    seen.table?.setPageIndex(2)

    await pick("Shipped")

    expect(seen.table?.atoms.pagination.get().pageIndex).toBe(0)
  })
})
