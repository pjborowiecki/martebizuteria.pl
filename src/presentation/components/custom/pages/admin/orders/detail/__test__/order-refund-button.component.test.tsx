import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_ORDER_REFUND_BLOCKER } from "~/src/modules/order/order.constants"

import { OrderRefundButton } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-refund-button"

afterEach(() => {
  cleanup()
})

describe("OrderRefundButton", () => {
  it("asks for the refund when Stripe can make it", async () => {
    const onClick = vi.fn<() => void>()
    renderWithProviders(<OrderRefundButton blocker={undefined} isPending={false} onClick={onClick} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it("stays disabled while another order action is running", async () => {
    const onClick = vi.fn<() => void>()
    renderWithProviders(<OrderRefundButton blocker={undefined} isPending onClick={onClick} />)

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))

    expect(screen.getByRole("button", { name: "Refund" })).toHaveAttribute("aria-disabled", "true")
    expect(onClick).not.toHaveBeenCalled()
  })

  it("disables a refund for an order with an open dispute and explains why", async () => {
    const onClick = vi.fn<() => void>()
    renderWithProviders(<OrderRefundButton blocker={ADMIN_ORDER_REFUND_BLOCKER.OPEN_DISPUTE} isPending={false} onClick={onClick} />)

    await userEvent.tab()

    expect(await screen.findByText(/This order has an open dispute\./u)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))

    expect(screen.getByRole("button", { name: "Refund" })).toHaveAttribute("aria-disabled", "true")
    expect(onClick).not.toHaveBeenCalled()
  })

  it("disables a refund for an order Stripe never charged and explains why", async () => {
    renderWithProviders(
      <OrderRefundButton blocker={ADMIN_ORDER_REFUND_BLOCKER.NO_STRIPE_PAYMENT} isPending={false} onClick={vi.fn<() => void>()} />,
    )

    await userEvent.tab()

    expect(screen.getByRole("button", { name: "Refund" })).toHaveAttribute("aria-disabled", "true")
    expect(await screen.findByText(/Stripe took no payment for it\./u)).toBeInTheDocument()
  })
})
