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
  ship: vi.fn<Mutate>(),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions", () => ({
  useCancelOrder: () => ({ isPending: false, mutate: mutations.cancel }),
  useFulfillOrder: () => ({ isPending: mutations.pending.current, mutate: mutations.fulfill }),
  useMarkOrderDelivered: () => ({ isPending: false, mutate: mutations.deliver }),
  useMarkOrderShipped: () => ({ isPending: false, mutate: mutations.ship }),
  useRefundOrder: () => ({ isPending: false, mutate: mutations.refund }),
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
  for (const mutate of [mutations.cancel, mutations.deliver, mutations.fulfill, mutations.refund, mutations.ship]) {
    mutate.mockImplementation(succeed)
  }
})

afterEach(() => {
  cleanup()
})

describe("OrderDetailActions refund", () => {
  it("confirms and refunds a paid order", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))
    await userEvent.click(await screen.findByRole("button", { name: "Refund order" }))

    expect(mutations.refund).toHaveBeenCalledWith({ orderId: ORDER_ID }, expect.anything())
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
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

    await userEvent.click(screen.getByRole("button", { name: "Cancel order" }))

    expect(await screen.findByText("Cancel this order?")).toBeInTheDocument()
    expect(screen.getByText(/Order #A1B2C3D4 will be marked cancelled/u)).toBeInTheDocument()

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel order" }))

    expect(mutations.cancel).toHaveBeenCalledWith({ orderId: ORDER_ID }, expect.anything())
    expect(screen.queryByText("Cancel this order?")).toBeNull()
  })

  it("keeps the order when the admin backs out of the cancellation", async () => {
    renderWithProviders(<OrderDetailActions order={buildAdminOrderDetail()} />)

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
