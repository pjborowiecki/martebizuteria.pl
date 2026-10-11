import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"

import { OrderWithdrawalsCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-withdrawals-card"

const withdrawal = (overrides: Partial<OrderWithdrawal["recorded"]>): OrderWithdrawal["recorded"] => ({
  consumerName: "Anna Kowalska",
  email: "anna@example.com",
  id: "withdrawal-1",
  items: undefined,
  reason: undefined,
  scope: "order",
  submittedAt: new Date("2026-10-10T12:30:00.000Z"),
  ...overrides,
})

afterEach(() => {
  cleanup()
})

describe("OrderWithdrawalsCard", () => {
  it("shows each statement with what it covers, when it arrived, who sent it and why", () => {
    renderWithProviders(
      <OrderWithdrawalsCard
        withdrawals={[
          withdrawal({ id: "withdrawal-1", items: "Kolczyki Luna × 2", reason: "Too small", scope: "items" }),
          withdrawal({ id: "withdrawal-2" }),
        ]}
      />,
    )

    expect(screen.getByText("Withdrawal from the contract")).toBeInTheDocument()
    expect(screen.getByText("Some products")).toBeInTheDocument()
    expect(screen.getByText("Kolczyki Luna × 2")).toBeInTheDocument()
    expect(screen.getByText("Reason: Too small")).toBeInTheDocument()
    expect(screen.getByText("The whole order")).toBeInTheDocument()
    expect(screen.getByText("No reason given")).toBeInTheDocument()
    expect(screen.getAllByText("Received on Oct 10, 2026, 2:30 PM")).toHaveLength(2)
    expect(screen.getAllByText("Anna Kowalska · anna@example.com")).toHaveLength(2)
  })

  it("stays out of an order nobody withdrew from", () => {
    const { container } = renderWithProviders(<OrderWithdrawalsCard withdrawals={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
