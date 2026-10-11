import { Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"

import { buildAccountOrderDetail } from "~/src/presentation/components/custom/pages/account/orders/__test__/account-order.fixture"

const state = vi.hoisted((): { withdrawal?: OrderWithdrawal["customerOrder"] } => ({}))

vi.mock("~/src/modules/order-withdrawal/use-cases/get-customer-order-withdrawal", () => ({
  getCustomerOrderWithdrawalQuery: (orderId: string) => ({
    queryFn: () => Promise.resolve(state.withdrawal),
    queryKey: ["order-withdrawal", "customerOrder", orderId],
  }),
}))
vi.mock("~/src/modules/order-withdrawal/use-cases/withdraw-from-customer-order", () => ({
  withdrawFromCustomerOrderMutation: { mutationFn: vi.fn(), mutationKey: ["order-withdrawal", "withdrawFromCustomerOrder"] },
}))

import { OrderWithdrawalBlock } from "~/src/presentation/components/custom/pages/account/orders/order-withdrawal-block"

const withdrawal = (overrides: Partial<OrderWithdrawal["customerOrder"]> = {}): OrderWithdrawal["customerOrder"] => ({
  canWithdraw: true,
  consumerName: "Anna Kowalska",
  email: "anna@example.com",
  statements: [],
  ...overrides,
})

const statement = (overrides: Partial<OrderWithdrawal["recorded"]>): OrderWithdrawal["recorded"] => ({
  consumerName: "Anna Kowalska",
  email: "anna@example.com",
  id: "withdrawal-1",
  items: undefined,
  reason: undefined,
  scope: "order",
  submittedAt: new Date("2026-10-10T12:30:00.000Z"),
  ...overrides,
})

const renderBlock = () =>
  renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <OrderWithdrawalBlock order={buildAccountOrderDetail()} />
    </Suspense>,
  )

beforeEach(() => {
  state.withdrawal = withdrawal()
})

afterEach(cleanup)

describe("OrderWithdrawalBlock", () => {
  it("offers the withdrawal function while the order can still be withdrawn from", async () => {
    renderBlock()

    expect(await screen.findByRole("heading", { name: "Withdrawal from the contract" })).toBeInTheDocument()
    expect(
      screen.getByText("You may withdraw from this contract within 14 days of receiving the products, without giving a reason."),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Withdraw from the contract" }))

    expect(await screen.findByRole("dialog", { name: "Withdraw from the contract" })).toBeInTheDocument()
  })

  it("lists the statements already sent and drops the button once the whole order is withdrawn", async () => {
    state.withdrawal = withdrawal({
      canWithdraw: false,
      statements: [
        statement({ id: "withdrawal-1", items: "Silver ring × 1", scope: "items" }),
        statement({ id: "withdrawal-2", submittedAt: new Date("2026-10-11T08:00:00.000Z") }),
      ],
    })
    renderBlock()

    expect(await screen.findByText("Statement sent on October 10, 2026 at 2:30 PM")).toBeInTheDocument()
    expect(screen.getByText("Silver ring × 1")).toBeInTheDocument()
    expect(screen.getByText("Statement sent on October 11, 2026 at 10:00 AM")).toBeInTheDocument()
    expect(screen.getByText("The whole order")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Withdraw from the contract" })).toBeNull()
  })

  it("shows nothing once the period is over and nothing was sent", async () => {
    state.withdrawal = withdrawal({ canWithdraw: false })
    const { container } = renderBlock()

    await vi.waitFor(() => {
      expect(screen.queryByText("loading")).toBeNull()
    })
    expect(container).toBeEmptyDOMElement()
  })
})
