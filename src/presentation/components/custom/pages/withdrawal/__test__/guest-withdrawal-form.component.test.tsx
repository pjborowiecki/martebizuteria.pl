import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const calls = vi.hoisted(() => ({
  toastError: vi.fn<(message: string) => void>(),
  withdraw: vi.fn<(data: Record<string, unknown>) => Promise<void>>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError } }))
vi.mock("~/src/modules/order-withdrawal/use-cases/withdraw-from-guest-order", () => ({
  withdrawFromGuestOrderMutation: {
    mutationFn: (data: Record<string, unknown>) => calls.withdraw(data),
    mutationKey: ["order-withdrawal", "withdrawFromGuestOrder"],
  },
}))

import { GuestWithdrawalForm } from "~/src/presentation/components/custom/pages/withdrawal/guest-withdrawal-form"

const confirmButton = (): HTMLElement => screen.getByRole("button", { name: "Confirm withdrawal" })

const fillStatement = async (): Promise<void> => {
  await userEvent.type(screen.getByLabelText(/Email address you ordered with/u), "anna@example.com")
  await userEvent.type(screen.getByLabelText(/Your full name/u), "Anna Kowalska")
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.withdraw.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe("GuestWithdrawalForm", () => {
  it("sends the statement for the order named in the email link and answers without saying whether the order was found", async () => {
    renderWithProviders(<GuestWithdrawalForm defaultOrderNumber="MRT-2026-00042" />)
    expect(screen.getByLabelText(/Order number/u)).toHaveValue("MRT-2026-00042")

    await fillStatement()
    await userEvent.click(confirmButton())

    expect(await screen.findByRole("heading", { name: "Thank you for your statement" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(
      "If an order with this number was placed with this email address and can still be withdrawn from, we have recorded your statement of withdrawal",
    )
    expect(screen.getByRole("status")).toHaveTextContent(/or write to us at kontakt@martebizuteria\.pl\.$/u)
    expect(calls.withdraw).toHaveBeenCalledExactlyOnceWith({
      consumerName: "Anna Kowalska",
      email: "anna@example.com",
      items: "",
      orderNumber: "MRT-2026-00042",
      reason: "",
      scope: "order",
    })
  })

  it("asks for the order number, the email and the name before sending anything", async () => {
    renderWithProviders(<GuestWithdrawalForm defaultOrderNumber={undefined} />)

    await userEvent.click(confirmButton())

    expect(await screen.findByText("Enter the order number from your confirmation email.")).toBeInTheDocument()
    expect(screen.getByText("Enter the email address you ordered with.")).toBeInTheDocument()
    expect(screen.getByText("Enter your full name.")).toBeInTheDocument()
    expect(calls.withdraw).not.toHaveBeenCalled()
  })

  it("asks which products a partial statement covers", async () => {
    renderWithProviders(<GuestWithdrawalForm defaultOrderNumber="MRT-2026-00042" />)
    await fillStatement()
    await userEvent.click(screen.getByRole("radio", { name: "Only some products" }))

    await userEvent.click(confirmButton())

    expect(await screen.findByText("Say which products you are withdrawing from.")).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("Which products"), "Luna earrings × 1")
    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(calls.withdraw).toHaveBeenCalledWith(expect.objectContaining({ items: "Luna earrings × 1", scope: "items" }))
    })
  })

  it("keeps the button disabled while the statement is on its way", async () => {
    const answer = Promise.withResolvers<undefined>()
    calls.withdraw.mockReturnValueOnce(answer.promise)
    renderWithProviders(<GuestWithdrawalForm defaultOrderNumber="MRT-2026-00042" />)
    await fillStatement()

    await userEvent.click(confirmButton())

    expect(await screen.findByRole("button", { name: "Sending…" })).toBeDisabled()
    answer.resolve(undefined)
    expect(await screen.findByRole("heading", { name: "Thank you for your statement" })).toBeInTheDocument()
  })

  it("reports a request the server turned away", async () => {
    calls.withdraw.mockRejectedValue(new Error("TOO_MANY_REQUESTS"))
    renderWithProviders(<GuestWithdrawalForm defaultOrderNumber="MRT-2026-00042" />)
    await fillStatement()

    await userEvent.click(confirmButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("Too many attempts. Please try again shortly.")
    })
  })
})
