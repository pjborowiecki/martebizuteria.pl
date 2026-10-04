import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { getDiscountByCodeForCustomerQuery, onApplied } = vi.hoisted(() => ({
  getDiscountByCodeForCustomerQuery:
    vi.fn<(code: string, email: string | undefined) => Promise<Discount["selectForCustomer"] | undefined>>(),
  onApplied: vi.fn<(code: string) => void>(),
}))

vi.mock("~/src/modules/discount/discount.accessors", () => ({ getDiscountByCodeForCustomerQuery }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: () => Promise.resolve(undefined) }))

import { type Discount } from "~/src/modules/discount/discount.types"

import { CheckoutDiscountField } from "~/src/presentation/components/custom/checkout/components/checkout-discount-field"

const discountRow = (overrides: Partial<Discount["selectForCustomer"]> = {}): Discount["selectForCustomer"] => ({
  code: "SPRING",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  description: null,
  endsAt: null,
  id: "discount-1",
  isActive: true,
  maxDiscountAmount: null,
  minOrderTotal: null,
  perCustomerLimit: null,
  redeemedByCustomer: 0,
  startsAt: null,
  type: "fixed_amount",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  usageCount: 0,
  usageLimit: null,
  value: 5000,
  ...overrides,
})

const renderField = () =>
  renderWithProviders(<CheckoutDiscountField email="ada@marte.test" itemsSubtotal={24_900} onApplied={onApplied} shippingTotal={1900} />)

const submitCode = async (code: string): Promise<void> => {
  await userEvent.type(screen.getByLabelText("Discount code"), code)
  await userEvent.click(screen.getByRole("button", { name: "Apply" }))
}

beforeEach(() => {
  vi.clearAllMocks()
  getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow())
})

afterEach(cleanup)

describe("CheckoutDiscountField", () => {
  it("hands an accepted code back, normalised, so the summary can apply it", async () => {
    renderField()

    await submitCode(" spring ")

    await waitFor(() => {
      expect(onApplied).toHaveBeenCalledExactlyOnceWith("SPRING")
    })
    expect(getDiscountByCodeForCustomerQuery).toHaveBeenCalledExactlyOnceWith("SPRING", "ada@marte.test")
  })

  it("locks the button behind a spinner while the code is being checked", async () => {
    getDiscountByCodeForCustomerQuery.mockReturnValue(new Promise(() => {}))
    renderField()

    await submitCode("SPRING")

    const button = await screen.findByRole("button")
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
    expect(button).not.toHaveTextContent("Apply")
    expect(onApplied).not.toHaveBeenCalled()
  })

  it("explains a code it does not recognise and applies nothing", async () => {
    getDiscountByCodeForCustomerQuery.mockResolvedValue(undefined)
    renderField()

    await submitCode("NOPE")

    expect(await screen.findByText("We do not recognise that code.")).toBeInTheDocument()
    expect(onApplied).not.toHaveBeenCalled()
  })

  it("drops the explanation as soon as the shopper edits the code", async () => {
    getDiscountByCodeForCustomerQuery.mockResolvedValue(undefined)
    renderField()
    await submitCode("NOPE")
    await screen.findByText("We do not recognise that code.")

    await userEvent.type(screen.getByLabelText("Discount code"), "S")

    expect(screen.queryByText("We do not recognise that code.")).not.toBeInTheDocument()
  })

  it("asks the shopper to try again when the code could not be checked", async () => {
    getDiscountByCodeForCustomerQuery.mockRejectedValue(new Error("D1 unavailable"))
    renderField()

    await submitCode("SPRING")

    expect(await screen.findByText("We could not check that code. Please try again.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled()
  })

  it("does not ask the server about an empty code", async () => {
    renderField()

    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(getDiscountByCodeForCustomerQuery).not.toHaveBeenCalled()
    expect(onApplied).not.toHaveBeenCalled()
  })
})
