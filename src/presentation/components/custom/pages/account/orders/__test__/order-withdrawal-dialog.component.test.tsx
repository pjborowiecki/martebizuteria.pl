import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { createSellerDetailsQueryClient } from "~/src/platform/testing/mocks/seller-details"

import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"

import {
  buildAccountOrderDetail,
  buildAccountOrderItem,
} from "~/src/presentation/components/custom/pages/account/orders/__test__/account-order.fixture"

const calls = vi.hoisted(() => ({
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string, options: { description: string }) => void>(),
  withdraw: vi.fn<(data: Record<string, unknown>) => Promise<OrderWithdrawal["result"]>>(),
}))

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})
vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/modules/order-withdrawal/use-cases/withdraw-from-customer-order", () => ({
  withdrawFromCustomerOrderMutation: {
    mutationFn: (data: Record<string, unknown>) => calls.withdraw(data),
    mutationKey: ["order-withdrawal", "withdrawFromCustomerOrder"],
  },
}))
vi.mock(import("~/src/presentation/components/shadcn/dialog"), async (importOriginal) => {
  const actual = await importOriginal()
  const { Dialog: DialogPrimitive } = await import("@base-ui/react/dialog")

  return {
    ...actual,
    Dialog: ({ children, ...props }: Parameters<typeof actual.Dialog>[0]) => (
      <actual.Dialog {...props}>
        <DialogPrimitive.Trigger>Open from a trigger</DialogPrimitive.Trigger>
        {typeof children === "function" ? undefined : children}
      </actual.Dialog>
    ),
  }
})

import { OrderWithdrawalDialog } from "~/src/presentation/components/custom/pages/account/orders/order-withdrawal-dialog"

const SUBMITTED_AT = new Date("2026-10-10T12:30:00.000Z")

const order = buildAccountOrderDetail({
  items: [buildAccountOrderItem(), buildAccountOrderItem({ id: "item-2", name: "Lapis necklace", qty: 1, variantTitle: "Gold" })],
})

const withdrawal: OrderWithdrawal["customerOrder"] = {
  canWithdraw: true,
  consumerName: "Anna Kowalska",
  email: "anna@example.com",
  statements: [],
}

const renderDialog = (open = true) => {
  const onOpenChange = vi.fn<(open: boolean) => void>()
  const rendered = renderWithProviders(
    <OrderWithdrawalDialog onOpenChange={onOpenChange} open={open} order={order} withdrawal={withdrawal} />,
    { queryClient: createSellerDetailsQueryClient() },
  )

  return { onOpenChange, queryClient: rendered.queryClient }
}

const confirmButton = (): HTMLElement => screen.getByRole("button", { name: "Confirm withdrawal" })

beforeEach(() => {
  vi.clearAllMocks()
  calls.withdraw.mockResolvedValue({
    outcome: "recorded",
    receipt: { acknowledged: true, email: "anna@example.com", submittedAt: SUBMITTED_AT },
  })
})

afterEach(cleanup)

describe("OrderWithdrawalDialog", () => {
  it("names the order, where the acknowledgement goes and who is withdrawing", () => {
    renderDialog()

    expect(screen.getByRole("dialog", { name: "Withdraw from the contract" })).toHaveTextContent(
      "Your statement of withdrawal from the contract for order MRT-2026-00007. We will confirm that we received it by email to anna@example.com.",
    )
    expect(screen.getByLabelText(/Your full name/u)).toHaveValue("Anna Kowalska")
    expect(screen.getByRole("radio", { name: "The whole order" })).toBeChecked()
  })

  it("sends a whole-order statement, refreshes the order's withdrawal and shows the acknowledgement", async () => {
    const { onOpenChange, queryClient } = renderDialog()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    await userEvent.type(screen.getByLabelText("Reason (optional)"), "Too small")
    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(calls.toastSuccess).toHaveBeenCalledWith("We have received your statement of withdrawal", {
        description: "On October 10, 2026 at 2:30 PM we received it and emailed a confirmation with its content to anna@example.com.",
      })
    })
    expect(calls.withdraw).toHaveBeenCalledWith({
      consumerName: "Anna Kowalska",
      orderId: order.id,
      orderItemIds: [],
      reason: "Too small",
      scope: "order",
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["order-withdrawal", "customerOrder", order.id] })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("asks which products a partial statement covers and sends the ones ticked", async () => {
    renderDialog()

    await userEvent.click(screen.getByRole("radio", { name: "Only some products" }))
    await userEvent.click(confirmButton())

    expect(await screen.findByText("Say which products you are withdrawing from.")).toBeInTheDocument()
    expect(calls.withdraw).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("checkbox", { name: "Silver ring × 2" }))
    await userEvent.click(screen.getByRole("checkbox", { name: "Lapis necklace — Gold × 1" }))
    await userEvent.click(screen.getByRole("checkbox", { name: "Silver ring × 2" }))
    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(calls.withdraw).toHaveBeenCalledWith(expect.objectContaining({ orderItemIds: ["item-2"], scope: "items" }))
    })
  })

  it("tells the customer why the shop refused the statement", async () => {
    calls.withdraw.mockResolvedValue({ outcome: "closed" })
    renderDialog()

    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith(
        "The withdrawal period for this order has ended, or the order was cancelled. If you think this is a mistake, write to us at sklep@marte.test.",
      )
    })
    expect(calls.toastSuccess).not.toHaveBeenCalled()
  })

  it("reports a request the server turned away", async () => {
    calls.withdraw.mockRejectedValue(new Error("TOO_MANY_REQUESTS"))
    const { onOpenChange } = renderDialog()

    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("Too many attempts. Please try again shortly.")
    })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("cannot be dismissed while the statement is on its way", async () => {
    const inFlight = Promise.withResolvers<OrderWithdrawal["result"]>()
    calls.withdraw.mockReturnValue(inFlight.promise)
    const { onOpenChange } = renderDialog()

    await userEvent.click(confirmButton())
    await waitFor(() => {
      expect(confirmButton()).toBeDisabled()
    })
    await userEvent.keyboard("{Escape}")

    expect(onOpenChange).not.toHaveBeenCalled()
    inFlight.resolve({ outcome: "alreadyWithdrawn" })
    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("You have already withdrawn from the contract for the whole of this order.")
    })
  })

  it("closes and forgets what was typed when cancelled", async () => {
    const { onOpenChange } = renderDialog()
    await userEvent.type(screen.getByLabelText("Reason (optional)"), "Too small")

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.getByLabelText("Reason (optional)")).toHaveValue("")
  })

  it("tells its owner when a trigger asks to open it", async () => {
    const { onOpenChange } = renderDialog(false)

    await userEvent.click(screen.getByRole("button", { name: "Open from a trigger" }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})
