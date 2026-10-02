import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const mutations = vi.hoisted(() => ({ other: vi.fn(), refund: vi.fn() }))

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions", () => ({
  useCancelOrder: () => ({ isPending: false, mutate: mutations.other }),
  useFulfillOrder: () => ({ isPending: false, mutate: mutations.other }),
  useMarkOrderDelivered: () => ({ isPending: false, mutate: mutations.other }),
  useMarkOrderShipped: () => ({ isPending: false, mutate: mutations.other }),
  useRefundOrder: () => ({ isPending: false, mutate: mutations.refund }),
}))

import {
  ORDER_ID,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderDetailActions } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail-actions"

const DISPUTE = { amount: 38_900, id: "dp_test_1", reason: "fraudulent", status: "needs_response" }

beforeEach(() => {
  vi.clearAllMocks()
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
