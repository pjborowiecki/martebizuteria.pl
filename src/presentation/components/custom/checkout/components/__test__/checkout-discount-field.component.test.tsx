import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { getDiscountByCodeForPreviewQuery, onApplied } = vi.hoisted(() => ({
  getDiscountByCodeForPreviewQuery:
    vi.fn<
      (lookup: {
        code: string
        customer: { email: string | undefined; userId: string | undefined }
        heldSessionId: string | undefined
      }) => Promise<Discount["selectForPreview"] | undefined>
    >(),
  onApplied: vi.fn<(code: string) => void>(),
}))

vi.mock("~/src/modules/discount/discount.accessors", () => ({ getDiscountByCodeForPreviewQuery }))
vi.mock("~/src/modules/product-variant/product-variant.accessors", () => ({
  getSellPricesByVariantIds: () => Promise.resolve(new Map([["variant-a", 24_900]])),
}))
vi.mock("~/src/modules/delivery-method/delivery-method.accessors", () => ({
  getOfferedDeliveryMethodByIdQuery: () => Promise.resolve({ price: 1900, type: "courier" }),
}))
vi.mock("~/src/integrations/better-auth/auth.middleware", async () => {
  const { createMiddleware } = await import("@tanstack/react-start")

  return {
    RATE_LIMITS: { CHECKOUT: { max: 10, window: 60 } },
    withRateLimit: () => createMiddleware({ type: "function" }).server(({ next }) => next()),
  }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: () => Promise.resolve(undefined) }))

import { type Discount } from "~/src/modules/discount/discount.types"

import { CheckoutDiscountField } from "~/src/presentation/components/custom/checkout/components/checkout-discount-field"

const discountRow = (overrides: Partial<Discount["selectForPreview"]> = {}): Discount["selectForPreview"] => ({
  code: "SPRING",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  description: null,
  endsAt: null,
  heldByOtherCheckouts: 0,
  heldForCustomer: 0,
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

const BASKET = {
  deliveryMethodId: "courier",
  email: "ada@marte.test",
  heldSessionId: "cs_test_own",
  lines: [{ qty: 1, variantId: "variant-a" }],
}

const renderField = () => renderWithProviders(<CheckoutDiscountField basket={BASKET} onApplied={onApplied} />)

const submitCode = async (code: string): Promise<void> => {
  await userEvent.type(screen.getByLabelText("Discount code"), code)
  await userEvent.click(screen.getByRole("button", { name: "Apply" }))
}

beforeEach(() => {
  vi.clearAllMocks()
  getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow())
})

afterEach(cleanup)

describe("CheckoutDiscountField", () => {
  it("hands an accepted code back, normalised, so the summary can apply it", async () => {
    renderField()

    await submitCode(" spring ")

    await waitFor(() => {
      expect(onApplied).toHaveBeenCalledExactlyOnceWith("SPRING")
    })
    expect(getDiscountByCodeForPreviewQuery).toHaveBeenCalledExactlyOnceWith({
      code: "SPRING",
      customer: { email: "ada@marte.test", userId: undefined },
      heldSessionId: "cs_test_own",
    })
  })

  it("locks the button behind a spinner while the code is being checked", async () => {
    getDiscountByCodeForPreviewQuery.mockReturnValue(new Promise(() => {}))
    renderField()

    await submitCode("SPRING")

    const button = await screen.findByRole("button")
    await waitFor(() => {
      expect(button).toBeDisabled()
    })
    expect(button).not.toHaveTextContent("Apply")
    expect(onApplied).not.toHaveBeenCalled()
  })

  it("explains a code whose remaining uses other checkouts hold and applies nothing", async () => {
    getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow({ heldByOtherCheckouts: 1, usageLimit: 1 }))
    renderField()

    await submitCode("SPRING")

    expect(await screen.findByText("That code is reserved for orders awaiting payment. Try again later.")).toBeInTheDocument()
    expect(onApplied).not.toHaveBeenCalled()
  })

  it("explains a code it does not recognise and applies nothing", async () => {
    getDiscountByCodeForPreviewQuery.mockResolvedValue(undefined)
    renderField()

    await submitCode("NOPE")

    expect(await screen.findByText("We do not recognise that code.")).toBeInTheDocument()
    expect(onApplied).not.toHaveBeenCalled()
  })

  it("drops the explanation as soon as the shopper edits the code", async () => {
    getDiscountByCodeForPreviewQuery.mockResolvedValue(undefined)
    renderField()
    await submitCode("NOPE")
    await screen.findByText("We do not recognise that code.")

    await userEvent.type(screen.getByLabelText("Discount code"), "S")

    expect(screen.queryByText("We do not recognise that code.")).not.toBeInTheDocument()
  })

  it("asks the shopper to try again when the code could not be checked", async () => {
    getDiscountByCodeForPreviewQuery.mockRejectedValue(new Error("D1 unavailable"))
    renderField()

    await submitCode("SPRING")

    expect(await screen.findByText("We could not check that code. Please try again.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled()
  })

  it("does not ask the server about an empty code", async () => {
    renderField()

    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(getDiscountByCodeForPreviewQuery).not.toHaveBeenCalled()
    expect(onApplied).not.toHaveBeenCalled()
  })
})
