import { cleanup, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type Order } from "~/src/modules/order/order.types"

interface MutateOptions {
  readonly onSuccess?: () => void
}

const stepBack = vi.hoisted(() => ({
  mutate: vi.fn<(variables: unknown, options?: MutateOptions) => void>(),
  pending: { current: false },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/orders/hooks/use-order-row-actions", () => ({
  useStepBackOrder: () => ({ isPending: stepBack.pending.current, mutate: stepBack.mutate }),
}))

import {
  ORDER_ID,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderStepBackAction } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-step-back-action"

const INPOST_WARNING =
  "The InPost shipment is not cancelled, and its tracking number stays on the order. If the parcel will not be sent, cancel the shipment in InPost Manager."

const delivered = (): Order["adminOrderDetail"] =>
  buildAdminOrderDetail({ fulfillmentStatus: "delivered", fulfillmentUiKey: "delivered", status: "completed" })

const openStepBack = async (order: Order["adminOrderDetail"]): Promise<HTMLElement> => {
  renderWithProviders(<OrderStepBackAction order={order} />)
  await userEvent.click(screen.getByRole("button", { name: "Back to previous step" }))

  return screen.findByRole("alertdialog", { name: "Move the order back a step?" })
}

beforeEach(() => {
  vi.clearAllMocks()
  stepBack.pending.current = false
  stepBack.mutate.mockImplementation((_variables, options) => {
    options?.onSuccess?.()
  })
})

afterEach(() => {
  cleanup()
})

describe("OrderStepBackAction confirmation", () => {
  it("names the steps and promises the customer no email before moving a shipped order back", async () => {
    const dialog = await openStepBack(buildAdminOrderDetail())

    expect(dialog).toHaveTextContent("Order #A1B2C3D4 goes back from “Shipped” to “In progress”. The customer is not emailed about it.")
    expect(dialog).toHaveTextContent(
      "Moving the order forward again later sends no second email for a step the order has already been through.",
    )
    expect(stepBack.mutate).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Move back" }))

    expect(stepBack.mutate).toHaveBeenCalledExactlyOnceWith({ fromStep: "shipped", orderId: ORDER_ID }, expect.anything())
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("moves a delivered order back to shipped", async () => {
    const dialog = await openStepBack(delivered())

    expect(dialog).toHaveTextContent("Order #A1B2C3D4 goes back from “Delivered” to “Shipped”.")

    await userEvent.click(within(dialog).getByRole("button", { name: "Move back" }))

    expect(stepBack.mutate).toHaveBeenCalledExactlyOnceWith({ fromStep: "delivered", orderId: ORDER_ID }, expect.anything())
  })

  it("leaves the order where it is when the admin backs out", async () => {
    const dialog = await openStepBack(buildAdminOrderDetail({ fulfillmentStatus: "fulfilled", fulfillmentUiKey: "processing" }))

    expect(dialog).toHaveTextContent("Order #A1B2C3D4 goes back from “In progress” to “Confirmed”.")

    await userEvent.click(within(dialog).getByRole("button", { name: "Keep as is" }))

    expect(stepBack.mutate).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("keeps the confirmation open while the step back fails", async () => {
    stepBack.mutate.mockReset()
    const dialog = await openStepBack(buildAdminOrderDetail())

    await userEvent.click(within(dialog).getByRole("button", { name: "Move back" }))

    expect(screen.getByRole("alertdialog", { name: "Move the order back a step?" })).toBeInTheDocument()
  })

  it("locks the action while the step back runs", () => {
    stepBack.pending.current = true
    renderWithProviders(<OrderStepBackAction order={buildAdminOrderDetail()} />)

    expect(screen.getByRole("button", { name: "Back to previous step" })).toBeDisabled()
  })
})

describe("OrderStepBackAction InPost warning", () => {
  it("warns that a booked InPost shipment is neither cancelled nor stripped of its tracking number", async () => {
    const dialog = await openStepBack(buildAdminOrderDetail({ inpostShipment: { id: "1234567", status: "confirmed" } }))

    expect(dialog).toHaveTextContent(INPOST_WARNING)
  })

  it("says nothing about InPost when the shipment was already cancelled there", async () => {
    const dialog = await openStepBack(buildAdminOrderDetail({ inpostShipment: { id: "1234567", status: "canceled" } }))

    expect(dialog).not.toHaveTextContent(INPOST_WARNING)
  })

  it("says nothing about InPost when the order was not shipped through it", async () => {
    const dialog = await openStepBack(buildAdminOrderDetail({ inpostShipment: undefined }))

    expect(dialog).not.toHaveTextContent(INPOST_WARNING)
  })

  it("says nothing about InPost when a delivered order moves back to shipped", async () => {
    const dialog = await openStepBack({ ...delivered(), inpostShipment: { id: "1234567", status: "delivered" } })

    expect(dialog).not.toHaveTextContent(INPOST_WARNING)
  })
})

describe("OrderStepBackAction availability", () => {
  it.each<[string, Partial<Order["adminOrderDetail"]>]>([
    ["a confirmed order", { fulfillmentStatus: "not_fulfilled", fulfillmentUiKey: "confirmed" }],
    ["a cancelled order", { fulfillmentStatus: "cancelled", fulfillmentUiKey: "cancelled", status: "cancelled" }],
    ["a refunded order", { status: "refunded" }],
  ])("offers no step back for %s", (_label, overrides) => {
    renderWithProviders(<OrderStepBackAction order={buildAdminOrderDetail(overrides)} />)

    expect(screen.queryByRole("button", { name: "Back to previous step" })).toBeNull()
  })
})
