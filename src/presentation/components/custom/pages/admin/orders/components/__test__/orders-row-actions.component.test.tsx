import { type MouseEvent } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDER_CANCEL_BLOCKER, type AdminOrderCancelBlocker } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

const handlers = vi.hoisted(() => ({
  availability: {
    canCancel: true,
    canFulfill: true,
    canPrintSummary: true,
    canRefund: true,
    canShip: true,
    cancelBlocker: undefined as AdminOrderCancelBlocker | undefined,
    cancelRefundsPayment: true,
  },
  calls: [] as string[],
  isPending: false,
}))

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-row-action-handlers", () => ({
  useOrdersRowActionHandlers: (order: { id: string }, setConfirmOpen: (open: boolean) => void) => ({
    ...handlers.availability,
    handleConfirmCancel: () => {
      handlers.calls.push(`confirmCancel:${order.id}`)
      setConfirmOpen(false)
    },
    handleConfirmFulfill: () => {
      handlers.calls.push(`confirmFulfill:${order.id}`)
      setConfirmOpen(false)
    },
    handleConfirmShip: ({ trackingNumber }: { readonly trackingNumber: string | undefined }) => {
      handlers.calls.push(`confirmShip:${order.id}:${String(trackingNumber)}`)
      setConfirmOpen(false)
    },
    handleCopyId: () => handlers.calls.push("copyId"),
    handlePrintSummary: () => handlers.calls.push("printSummary"),
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
  emailedSteps: [],
  fulfillmentStatus: "not_fulfilled",
  fulfillmentUiKey: "confirmed",
  hasOpenDispute: false,
  id: "order-1",
  initials: "AN",
  itemCount: 2,
  orderNumber: "MRT-2026-00001",
  paymentUiKey: "paid",
  status: "processing",
  totalMinorUnits: 12_000,
  userId: null,
}

const DISPUTE_BLOCKS_CANCEL =
  "This order has an open dispute. Cancelling would refund its payment, which the dispute now decides, so the order cannot be cancelled until the dispute closes."

const openMenu = async (order: Order["adminListItem"] = ORDER) => {
  renderWithProviders(<OrdersRowActions order={order} />)
  await userEvent.click(screen.getByRole("button", { name: `Actions for order ${order.orderNumber}` }))
}

beforeEach(() => {
  handlers.availability = {
    canCancel: true,
    canFulfill: true,
    canPrintSummary: true,
    canRefund: true,
    canShip: true,
    cancelBlocker: undefined,
    cancelRefundsPayment: true,
  }
  handlers.calls.length = 0
  handlers.isPending = false
})

afterEach(() => {
  cleanup()
})

describe("OrdersRowActions menu", () => {
  it("names its menu button after the order for screen readers", () => {
    renderWithProviders(<OrdersRowActions order={ORDER} />)

    expect(screen.getByRole("button")).toHaveAccessibleName("Actions for order MRT-2026-00001")
  })

  it("offers every action and names the order in the copy entry", async () => {
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "View order" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy ID" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Start fulfillment" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Mark as shipped" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Print order summary" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Refund" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Cancel order" })).toBeInTheDocument()
  })

  it.each([
    ["View order", "viewOrder"],
    ["Copy ID", "copyId"],
    ["Print order summary", "printSummary"],
    ["Refund", "refund"],
  ])("runs the %s action", async (label, expected) => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: label }))

    expect(handlers.calls).toStrictEqual([expected])
  })
})

describe("OrdersRowActions availability", () => {
  it("disables the state changing actions the order does not allow", async () => {
    handlers.availability = {
      canCancel: false,
      canFulfill: false,
      canPrintSummary: false,
      canRefund: false,
      canShip: false,
      cancelBlocker: undefined,
      cancelRefundsPayment: false,
    }
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Start fulfillment" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Mark as shipped" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Print order summary" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Refund" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Cancel order" })).toHaveAttribute("data-disabled")
  })

  it("leaves reading the order possible even when nothing can be changed", async () => {
    handlers.availability = {
      canCancel: false,
      canFulfill: false,
      canPrintSummary: false,
      canRefund: false,
      canShip: false,
      cancelBlocker: undefined,
      cancelRefundsPayment: false,
    }
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "View order" })).not.toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Copy ID" })).not.toHaveAttribute("data-disabled")
  })

  it("locks the mutating actions while an update is in flight", async () => {
    handlers.isPending = true
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Start fulfillment" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Mark as shipped" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Cancel order" })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: "Print order summary" })).not.toHaveAttribute("data-disabled")
  })
})

describe("OrdersRowActions cancellation", () => {
  it("asks for confirmation naming the order and the refund its cancellation issues", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancel order" }))

    expect(await screen.findByText("Cancel order?")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Order MRT-2026-00001 will be cancelled, its items returned to stock and the customer's payment refunded in full through Stripe. The customer is emailed about the cancellation and the refund. This action cannot be undone.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Keep order" })).toBeInTheDocument()
  })

  it("says there is no payment to refund when the order cost nothing", async () => {
    handlers.availability = { ...handlers.availability, cancelRefundsPayment: false }
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancel order" }))

    expect(
      await screen.findByText(
        "Order MRT-2026-00001 will be cancelled and its items returned to stock. There is no payment to refund. The customer is emailed about the cancellation. This action cannot be undone.",
      ),
    ).toBeInTheDocument()
  })

  it("cancels the order only once the dialog is confirmed", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancel order" }))

    expect(handlers.calls).toStrictEqual([])

    await userEvent.click(await screen.findByRole("button", { name: "Cancel order" }))

    expect(handlers.calls).toStrictEqual(["confirmCancel:order-1"])
  })

  it("never renders the confirmation for an order that cannot be cancelled", async () => {
    handlers.availability = { ...handlers.availability, canCancel: false }
    await openMenu()

    expect(screen.queryByText("Cancel order?")).toBeNull()
  })

  it("disables the cancellation of an order with an open dispute and says why", async () => {
    handlers.availability = { ...handlers.availability, cancelBlocker: ADMIN_ORDER_CANCEL_BLOCKER.OPEN_DISPUTE }
    await openMenu()
    const cancel = await screen.findByRole("menuitem", { name: "Cancel order" })

    expect(cancel).toHaveAttribute("data-disabled")
    expect(cancel).toHaveAccessibleDescription(DISPUTE_BLOCKS_CANCEL)

    await userEvent.click(cancel)

    expect(handlers.calls).toStrictEqual([])
    expect(screen.queryByText("Cancel order?")).toBeNull()
  })

  it("explains no dispute on an order that could not be cancelled anyway", async () => {
    handlers.availability = { ...handlers.availability, canCancel: false, cancelBlocker: ADMIN_ORDER_CANCEL_BLOCKER.OPEN_DISPUTE }
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Cancel order" })).not.toHaveAccessibleDescription()
    expect(screen.queryByText(DISPUTE_BLOCKS_CANCEL)).toBeNull()
  })
})

describe("OrdersRowActions fulfilment and shipping", () => {
  it("asks before starting fulfilment and names the email the customer receives", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Start fulfillment" }))
    const dialog = await screen.findByRole("alertdialog", { name: "Start fulfillment?" })

    expect(dialog).toHaveTextContent("Order MRT-2026-00001 moves to “In progress”.")
    expect(dialog).toHaveTextContent("The customer receives the “Fulfillment started notice” email.")
    expect(handlers.calls).toStrictEqual([])

    await userEvent.click(screen.getByRole("button", { name: "Start fulfillment" }))

    expect(handlers.calls).toStrictEqual(["confirmFulfill:order-1"])
  })

  it("tells the admin the customer already had the fulfilment email after a step back", async () => {
    await openMenu({ ...ORDER, emailedSteps: ["processing"] })
    await userEvent.click(await screen.findByRole("menuitem", { name: "Start fulfillment" }))

    expect(await screen.findByRole("alertdialog", { name: "Start fulfillment?" })).toHaveTextContent(
      "The order already reached this step before, so the “Fulfillment started notice” email is not sent again.",
    )
  })

  it("opens the shipping dialog for the tracking number instead of shipping at once", async () => {
    await openMenu({ ...ORDER, fulfillmentStatus: "fulfilled", fulfillmentUiKey: "processing" })
    await userEvent.click(await screen.findByRole("menuitem", { name: "Mark as shipped" }))
    const dialog = await screen.findByRole("dialog", { name: "Mark order as shipped" })

    expect(dialog).toHaveTextContent("The customer receives the “Shipping notice” email.")
    expect(handlers.calls).toStrictEqual([])

    await userEvent.type(screen.getByRole("textbox", { name: "Tracking number" }), "00259007123456789012")
    await userEvent.click(screen.getByRole("button", { name: "Mark shipped" }))

    expect(handlers.calls).toStrictEqual(["confirmShip:order-1:00259007123456789012"])
  })

  it("renders neither dialog for an order that can be neither fulfilled nor shipped", async () => {
    handlers.availability = { ...handlers.availability, canFulfill: false, canShip: false }
    await openMenu()

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
