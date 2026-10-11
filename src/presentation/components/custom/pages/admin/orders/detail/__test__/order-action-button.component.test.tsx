import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OrderActionButton } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-action-button"

const BLOCKED_REASON = "This order has an open dispute."

afterEach(() => {
  cleanup()
})

describe("OrderActionButton", () => {
  it("runs the action when nothing blocks it", async () => {
    const onClick = vi.fn<() => void>()
    renderWithProviders(
      <OrderActionButton blockedReason={undefined} isPending={false} onClick={onClick}>
        Refund
      </OrderActionButton>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it("stays disabled while another order action is running", async () => {
    const onClick = vi.fn<() => void>()
    renderWithProviders(
      <OrderActionButton blockedReason={undefined} isPending onClick={onClick}>
        Refund
      </OrderActionButton>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Refund" }))

    expect(screen.getByRole("button", { name: "Refund" })).toHaveAttribute("aria-disabled", "true")
    expect(onClick).not.toHaveBeenCalled()
  })

  it("disables a blocked action, keeps it focusable and explains why", async () => {
    const onClick = vi.fn<() => void>()
    renderWithProviders(
      <OrderActionButton blockedReason={BLOCKED_REASON} isPending={false} onClick={onClick}>
        Cancel order
      </OrderActionButton>,
    )

    await userEvent.tab()

    expect(screen.getByRole("button", { name: "Cancel order" })).toHaveFocus()
    expect(await screen.findByText(BLOCKED_REASON)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Cancel order" }))

    expect(screen.getByRole("button", { name: "Cancel order" })).toHaveAttribute("aria-disabled", "true")
    expect(onClick).not.toHaveBeenCalled()
  })
})
