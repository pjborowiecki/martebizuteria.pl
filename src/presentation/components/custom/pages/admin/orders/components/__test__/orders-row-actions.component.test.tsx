import { type MouseEvent } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Order } from "~/src/modules/order/order.types"

const handlers = vi.hoisted(() => ({
  availability: { canCancel: true, canFulfill: true, canPrint: true, canRefund: true, canShip: true },
  calls: [] as string[],
  isPending: false,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-row-action-handlers", () => ({
  useOrdersRowActionHandlers: (order: { id: string }, closeMenu: () => void, setConfirmOpen: (open: boolean) => void) => ({
    ...handlers.availability,
    handleCancelRequest: () => {
      handlers.calls.push("cancelRequest")
      closeMenu()
    },
    handleConfirmCancel: () => {
      handlers.calls.push(`confirmCancel:${order.id}`)
      setConfirmOpen(false)
    },
    handleCopyId: () => handlers.calls.push("copyId"),
    handleFulfill: () => handlers.calls.push("fulfill"),
    handleMarkShipped: () => handlers.calls.push("markShipped"),
    handlePrintInvoice: () => handlers.calls.push("printInvoice"),
    handleRefund: () => handlers.calls.push("refund"),
    handleStopRowClick: (event: MouseEvent) => {
      event.stopPropagation()
    },
    handleViewOrder: () => handlers.calls.push("viewOrder"),
    isPending: handlers.isPending,
    runMenuAction: (action: () => void) => (event: MouseEvent) => {
      event.preventDefault()
      action()
    },
  }),
}))

import { OrdersRowActions } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-row-actions"

const ORDER: Order["adminListItem"] = {
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  currencyCode: "PLN",
  customerName: "Ada Nowak",
  email: "ada@example.test",
  fulfillmentStatus: "not_fulfilled",
  fulfillmentUiKey: "unfulfilled",
  id: "order-1",
  initials: "AN",
  itemCount: 2,
  paymentUiKey: "paid",
  status: "processing",
  totalMinorUnits: 12_000,
  userId: null,
}

const openMenu = async () => {
  renderWithProviders(<OrdersRowActions order={ORDER} />)
  const [trigger] = screen.getAllByRole("button")
  if (trigger === undefined) {
    throw new Error("The row action trigger was not rendered")
  }
  await userEvent.click(trigger)
}

beforeEach(() => {
  handlers.availability = { canCancel: true, canFulfill: true, canPrint: true, canRefund: true, canShip: true }
  handlers.calls.length = 0
  handlers.isPending = false
})

afterEach(() => {
  cleanup()
})

describe("OrdersRowActions menu", () => {
  it("offers every action and names the order in the copy entry", async () => {
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "View order" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy #order-1" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Fulfill order" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Mark as shipped" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Print invoice" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Refund" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Cancel order" })).toBeInTheDocument()
  })

  it.each([
    ["View order", "viewOrder"],
    ["Copy #order-1", "copyId"],
    ["Fulfill order", "fulfill"],
    ["Mark as shipped", "markShipped"],
    ["Print invoice", "printInvoice"],
    ["Refund", "refund"],
  ])("runs the %s action", async (label, expected) => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: label }))

    expect(handlers.calls).toStrictEqual([expected])
  })
})

describe("OrdersRowActions availability", () => {
  it("disables the state changing actions the order does not allow", async () => {
    handlers.availability = { canCancel: false, canFulfill: false, canPrint: false, canRefund: false, canShip: false }
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Fulfill order" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Mark as shipped" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Print invoice" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Refund" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Cancel order" })).toHaveAttribute("data-disabled")
  })

  it("leaves reading the order possible even when nothing can be changed", async () => {
    handlers.availability = { canCancel: false, canFulfill: false, canPrint: false, canRefund: false, canShip: false }
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "View order" })).not.toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Copy #order-1" })).not.toHaveAttribute("data-disabled")
  })

  it("locks the mutating actions while an update is in flight", async () => {
    handlers.isPending = true
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Fulfill order" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Mark as shipped" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Cancel order" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Print invoice" })).not.toHaveAttribute("data-disabled")
  })
})

describe("OrdersRowActions cancellation", () => {
  it("asks for confirmation naming the order", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancel order" }))

    expect(await screen.findByText("Cancel order?")).toBeInTheDocument()
    expect(screen.getByText("Order #order-1 will be cancelled. This action cannot be undone.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keep order" })).toBeInTheDocument()
  })

  it("cancels the order only once the dialog is confirmed", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancel order" }))

    expect(handlers.calls).toStrictEqual(["cancelRequest"])

    await userEvent.click(await screen.findByRole("button", { name: "Cancel order" }))

    expect(handlers.calls).toStrictEqual(["cancelRequest", "confirmCancel:order-1"])
  })

  it("never renders the confirmation for an order that cannot be cancelled", async () => {
    handlers.availability = { ...handlers.availability, canCancel: false }
    await openMenu()

    expect(screen.queryByText("Cancel order?")).toBeNull()
  })
})
