import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PAYMENT_METHOD_QUERY_KEYS } from "~/src/modules/payment/payment.constants"
import { type Payment } from "~/src/modules/payment/payment.types"

const calls = vi.hoisted(() => ({
  deleteMethod: vi.fn<(input: { paymentMethodId: string }) => Promise<{ ok: boolean }>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/modules/payment/use-cases/delete-saved-payment-method", async () => {
  const { PAYMENT_METHOD_MUTATION_KEYS } = await import("~/src/modules/payment/payment.constants")

  return { deleteSavedPaymentMethodMutation: { mutationFn: calls.deleteMethod, mutationKey: PAYMENT_METHOD_MUTATION_KEYS.DELETE } }
})

import { SavedCardList } from "~/src/presentation/components/custom/pages/account/payment/saved-card-list"

const VISA: Payment["savedMethod"] = { brand: "visa", expMonth: 4, expYear: 2030, id: "pm_visa", isExpired: false, last4: "4242" }

const removeButton = (): HTMLElement => screen.getByRole("button", { name: "Remove card" })

const removeButtonAt = (index: number): HTMLElement => {
  const button = screen.getAllByRole("button", { name: "Remove card" })[index]
  if (button === undefined) {
    throw new Error(`the card list rendered no remove button at index ${index}`)
  }

  return button
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.deleteMethod.mockResolvedValue({ ok: true })
})

afterEach(cleanup)

describe("SavedCardList", () => {
  it("explains an empty wallet instead of listing nothing", () => {
    renderWithProviders(<SavedCardList methods={[]} />)

    expect(screen.getByText("No saved cards yet. Add one here, or save your card the next time you pay.")).toBeInTheDocument()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("writes a single digit expiry month with a leading zero", () => {
    renderWithProviders(<SavedCardList methods={[VISA]} />)

    expect(screen.getByRole("listitem")).toHaveTextContent("Expires 04/2030")
  })

  it("removes the card the customer chose", async () => {
    renderWithProviders(<SavedCardList methods={[VISA, { ...VISA, id: "pm_other", last4: "1881" }]} />)

    await userEvent.click(removeButtonAt(1))

    await waitFor(() => {
      expect(calls.deleteMethod).toHaveBeenCalledOnce()
    })
    expect(calls.deleteMethod.mock.calls[0]?.[0]).toStrictEqual({ paymentMethodId: "pm_other" })
  })

  it("confirms the removal and reloads the saved cards", async () => {
    const { queryClient } = renderWithProviders(<SavedCardList methods={[VISA]} />)
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")

    await userEvent.click(removeButton())

    await waitFor(() => {
      expect(calls.toastSuccess).toHaveBeenCalledWith("Card removed")
    })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED })
  })

  it("says so when the card could not be removed and keeps the wallet as it was", async () => {
    calls.deleteMethod.mockRejectedValue(new Error("stripe unavailable"))
    const { queryClient } = renderWithProviders(<SavedCardList methods={[VISA]} />)
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")

    await userEvent.click(removeButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledWith("We could not remove that card. Please try again.")
    })
    expect(calls.toastSuccess).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
    expect(removeButton()).toBeEnabled()
  })

  it("blocks a second removal while the first is still running", async () => {
    const inFlight = Promise.withResolvers<{ ok: boolean }>()
    calls.deleteMethod.mockReturnValue(inFlight.promise)
    renderWithProviders(<SavedCardList methods={[VISA]} />)

    await userEvent.click(removeButton())

    await waitFor(() => {
      expect(removeButton()).toBeDisabled()
    })
    inFlight.resolve({ ok: true })
    await waitFor(() => {
      expect(removeButton()).toBeEnabled()
    })
    expect(calls.deleteMethod).toHaveBeenCalledOnce()
  })
})
