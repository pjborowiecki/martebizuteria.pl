import { cleanup, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface MutateOptions {
  readonly onSuccess?: () => void
}

type Mutate = (variables: unknown, options?: MutateOptions) => void

const mutations = vi.hoisted(() => ({
  cancel: vi.fn<Mutate>(),
  deliver: vi.fn<Mutate>(),
  fulfill: vi.fn<Mutate>(),
  pending: { current: false },
  refund: vi.fn<Mutate>(),
  restock: vi.fn<Mutate>(),
  ship: vi.fn<Mutate>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions", () => ({
  useCancelOrder: () => ({ isPending: false, mutate: mutations.cancel }),
  useFulfillOrder: () => ({ isPending: mutations.pending.current, mutate: mutations.fulfill }),
  useMarkOrderDelivered: () => ({ isPending: false, mutate: mutations.deliver }),
  useMarkOrderShipped: () => ({ isPending: false, mutate: mutations.ship }),
  useRefundOrder: () => ({ isPending: false, mutate: mutations.refund }),
  useRestockOrder: () => ({ isPending: false, mutate: mutations.restock }),
}))

import {
  ORDER_ID,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderDetailActions } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail-actions"

const DISPUTE = { amount: 38_900, id: "dp_test_1", reason: "fraudulent", status: "needs_response" }

const print = vi.fn<() => void>()

vi.stubGlobal("print", print)

const succeed: Mutate = (_variables, options) => {
  options?.onSuccess?.()
}

const unfulfilled = () => buildAdminOrderDetail({ fulfillmentStatus: "not_fulfilled", fulfillmentUiKey: "unfulfilled" })

const fulfilled = () => buildAdminOrderDetail({ fulfillmentStatus: "fulfilled", fulfillmentUiKey: "unfulfilled" })

beforeEach(() => {
  vi.clearAllMocks()
  mutations.pending.current = false
  for (const mutate of [mutations.cancel, mutations.deliver, mutations.fulfill, mutations.refund, mutations.restock, mutations.ship]) {
    mutate.mockImplementation(succeed)
  }
})

afterEach(() => {
  cleanup()
})

const refunded = () => buildAdminOrderDetail({ paymentUiKey: "refunded", status: "refunded", tags: ["notRestocked"] })

describe("OrderDetailActions refund", () => {
  it("refunds a shipped order without returning its items to stock unless the admin says they came back", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))

    expect(await screen.findByRole("checkbox", { name: "The items came back to stock" })).not.toBeChecked()

    await userEvent.click(screen.getByRole("button", { name: "Refund order" }))

    expect(mutations.refund).toHaveBeenCalledWith({ orderId: ORDER_ID, restock: false }, expect.anything())
  })

  it("returns a shipped order's items to stock when the admin ticks that they came back", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))
    await userEvent.click(await screen.findByRole("checkbox", { name: "The items came back to stock" }))
    await userEvent.click(screen.getByRole("button", { name: "Refund order" }))

    expect(mutations.refund).toHaveBeenCalledWith({ orderId: ORDER_ID, restock: true }, expect.anything())
  })

  it("expects the items of an order that never left the shop back in stock unless the admin clears it", async () => {
    renderWithProviders(<OrderDetailActions order={unfulfilled()} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))
    const restock = await screen.findByRole("checkbox", { name: "The items came back to stock" })

    expect(restock).toBeChecked()

    await userEvent.click(restock)
    await userEvent.click(screen.getByRole("button", { name: "Refund order" }))

    expect(mutations.refund).toHaveBeenCalledWith({ orderId: ORDER_ID, restock: false }, expect.anything())
  })

  it("starts every refund confirmation from the order's default again", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))
    await userEvent.click(await screen.findByRole("checkbox", { name: "The items came back to stock" }))
    await userEvent.click(screen.getByRole("button", { name: "Keep order" }))
    await userEvent.click(screen.getByRole("button", { name: "Refund" }))

    expect(await screen.findByRole("checkbox", { name: "The items came back to stock" })).not.toBeChecked()
    expect(mutations.refund).not.toHaveBeenCalled()
  })

  it("keeps the refund confirmation closed while the order has an open dispute", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail({ dispute: DISPUTE })} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))

    expect(screen.getByRole("button", { name: "Refund" })).toHaveAttribute("aria-disabled", "true")
    expect(screen.queryByText("Refund this order?")).toBeNull()
  })

  it("keeps the refund confirmation closed for a free order", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail({ totalMinorUnits: 0 })} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))

    expect(screen.getByRole("button", { name: "Refund" })).toHaveAttribute("aria-disabled", "true")
    expect(screen.queryByText("Refund this order?")).toBeNull()
  })

  it("hides the refund for an order that is already refunded", () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail({ paymentUiKey: "refunded", status: "refunded" })} />)

    expect(screen.queryByRole("button", { name: "Refund" })).toBeNull()
  })
})

describe("OrderDetailActions return to stock", () => {
  it("returns the items of a refunded order to stock once the admin confirms, and closes the confirmation", async () => {
    renderWithProviders(<OrderDetailActions order={refunded()} />)

    await userEvent.click(screen.getByRole("button", { name: "Return to stock" }))

    expect(
      await screen.findByText(
        "The items of order #A1B2C3D4 go back on sale. Do this only once the goods are back in the shop. An order's items return to stock only once.",
      ),
    ).toBeInTheDocument()

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Return to stock" }))

    expect(mutations.restock).toHaveBeenCalledWith({ orderId: ORDER_ID }, expect.anything())
    expect(screen.queryByText("Return the items to stock?")).toBeNull()
  })

  it("keeps the items out of stock when the admin backs out", async () => {
    renderWithProviders(<OrderDetailActions order={refunded()} />)

    await userEvent.click(screen.getByRole("button", { name: "Return to stock" }))
    await userEvent.click(await screen.findByRole("button", { name: "Not now" }))

    expect(mutations.restock).not.toHaveBeenCalled()
  })

  it("offers no return to stock once the order's items are back", () => {
    renderWithProviders(<OrderDetailActions order={{ ...refunded(), restockedAt: new Date("2026-10-05T10:00:00.000Z") }} />)

    expect(screen.queryByRole("button", { name: "Return to stock" })).toBeNull()
  })

  it("offers no return to stock for an order that still has its money", () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    expect(screen.queryByRole("button", { name: "Return to stock" })).toBeNull()
  })
})

describe("OrderDetailActions print", () => {
  it("prints the order invoice", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    await userEvent.click(screen.getByRole("button", { name: "Print" }))

    expect(print).toHaveBeenCalledOnce()
  })

  it("withholds the invoice of a cancelled order", () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail({ fulfillmentStatus: "cancelled", status: "cancelled" })} />)

    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled()
  })
})

describe("OrderDetailActions refund confirmation", () => {
  it("closes the refund confirmation once the refund is accepted", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))
    await userEvent.click(await screen.findByRole("button", { name: "Refund order" }))

    expect(screen.queryByText("Refund this order?")).toBeNull()
  })

  it("names the order in the refund confirmation", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))

    expect(await screen.findByText(/full refund for order #A1B2C3D4/u)).toBeInTheDocument()
  })
})

describe("OrderDetailActions cancel", () => {
  it("cancels an open order once the admin confirms and closes the confirmation", async () => {
    renderWithProviders(<OrderDetailActions order={unfulfilled()} />)

    await userEvent.click(screen.getByRole("button", { name: "Cancel order" }))

    expect(await screen.findByText("Cancel this order?")).toBeInTheDocument()

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel order" }))

    expect(mutations.cancel).toHaveBeenCalledWith({ orderId: ORDER_ID }, expect.anything())
    expect(screen.queryByText("Cancel this order?")).toBeNull()
  })

  it("tells the admin that cancelling a paid order refunds it in full through Stripe", async () => {
    renderWithProviders(<OrderDetailActions order={unfulfilled()} />)

    await userEvent.click(screen.getByRole("button", { name: "Cancel order" }))

    expect(
      await screen.findByText(
        "Order #A1B2C3D4 will be cancelled, its items returned to stock and the customer's payment refunded in full through Stripe. The customer is emailed about the cancellation and the refund. This cannot be undone.",
      ),
    ).toBeInTheDocument()
  })

  it("tells the admin that a free order has no payment to refund", async () => {
    renderWithProviders(
      <OrderDetailActions
        order={buildAdminOrderDetail({ fulfillmentStatus: "not_fulfilled", fulfillmentUiKey: "unfulfilled", totalMinorUnits: 0 })}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Cancel order" }))

    expect(
      await screen.findByText(
        "Order #A1B2C3D4 will be cancelled and its items returned to stock. There is no payment to refund. The customer is emailed about the cancellation. This cannot be undone.",
      ),
    ).toBeInTheDocument()
  })

  it("offers no cancellation once the parcel has shipped", () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail({ fulfillmentStatus: "shipped" })} />)

    expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull()
  })

  it("keeps the order when the admin backs out of the cancellation", async () => {
    renderWithProviders(<OrderDetailActions order={unfulfilled()} />)

    await userEvent.click(screen.getByRole("button", { name: "Cancel order" }))
    await userEvent.click(await screen.findByRole("button", { name: "Keep order" }))

    expect(mutations.cancel).not.toHaveBeenCalled()
  })

  it("offers no cancellation for a completed order", () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail({ fulfillmentStatus: "delivered", status: "completed" })} />)

    expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull()
  })
})

describe("OrderDetailActions fulfillment", () => {
  it("starts fulfilling an unfulfilled order", async () => {
    renderWithProviders(<OrderDetailActions order={unfulfilled()} />)

    await userEvent.click(screen.getByRole("button", { name: "Fulfill" }))

    expect(mutations.fulfill).toHaveBeenCalledWith({ orderId: ORDER_ID })
  })

  it("locks the order actions and spins the fulfill button while an action runs", () => {
    mutations.pending.current = true
    renderWithProviders(<OrderDetailActions order={unfulfilled()} />)

    const fulfill = screen.getByRole("button", { name: "Fulfill" })

    expect(fulfill).toBeDisabled()
    expect(fulfill.querySelector(".animate-spin")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Cancel order" })).toBeDisabled()
  })
})

describe("OrderDetailActions shipping", () => {
  it("ships a fulfilled order with the tracking the admin entered and closes the dialog", async () => {
    renderWithProviders(<OrderDetailActions order={fulfilled()} />)

    await userEvent.click(screen.getByRole("button", { name: "Mark shipped" }))
    await userEvent.type(await screen.findByRole("textbox", { name: "Tracking number" }), "00259007123456789012")
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark shipped" }))

    expect(mutations.ship).toHaveBeenCalledWith(
      { orderId: ORDER_ID, trackingNumber: "00259007123456789012", trackingUrl: undefined },
      expect.anything(),
    )
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("offers shipping only once the order is fulfilled", () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    expect(screen.queryByRole("button", { name: "Mark shipped" })).toBeNull()
  })
})

describe("OrderDetailActions delivery", () => {
  it("marks a shipped order delivered", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    await userEvent.click(screen.getByRole("button", { name: "Mark delivered" }))

    expect(mutations.deliver).toHaveBeenCalledWith({ orderId: ORDER_ID })
  })

  it("locks and spins the delivery hand-off while an action runs", () => {
    mutations.pending.current = true
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    const markDelivered = screen.getByRole("button", { name: "Mark delivered" })

    expect(markDelivered).toBeDisabled()
    expect(markDelivered.querySelector(".animate-spin")).not.toBeNull()
  })

  it("offers no delivery hand-off before the order ships", () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail({ fulfillmentStatus: "fulfilled" })} />)

    expect(screen.queryByRole("button", { name: "Mark delivered" })).toBeNull()
  })
})
