import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { validateDiscountCode } = vi.hoisted(() => ({
  validateDiscountCode: vi.fn<(input: { code: string }) => Promise<{ applied?: object; rejection?: string }>>(),
}))

const deliveryMethods: { id: string; name: string; price: number }[] = [
  { id: "courier", name: "DPD courier", price: 1900 },
  { id: "pickup", name: "Atelier pickup", price: 0 },
]

vi.mock("~/src/modules/delivery-method/use-cases/list-delivery-methods", () => ({
  listDeliveryMethodsQuery: () => ({ queryFn: () => Promise.resolve(deliveryMethods), queryKey: ["delivery-method", "all"] }),
}))
vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://assets.test",
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  getBaseURL: () => "https://marte.test",
  isAssetCdnUrl: () => true,
  resolveAssetURL: (src: string) => src,
}))
vi.mock("~/src/modules/discount/use-cases/validate-discount-code", () => ({
  validateDiscountCodeMutation: { mutationFn: validateDiscountCode, mutationKey: ["discount", "validate"] },
}))
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => vi.fn(), useSearch: () => ({ step: 1 }) }
})

import { useCartStore } from "~/src/modules/cart/cart.store"

import { CheckoutFormProvider } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import { CheckoutSummary } from "~/src/presentation/components/custom/checkout/components/checkout-summary"

const addLine = ({
  qty,
  rawPrice,
  variantId,
  variantTitle = "Rozmiar M",
}: Readonly<{ qty: number; rawPrice: number; variantId: string; variantTitle?: string }>): void => {
  useCartStore.getState().addItem({
    id: `line-${variantId}`,
    image: "bracelet.jpg",
    price: "249,00 zł",
    qty,
    rawPrice,
    slug: "bransoletka-aurora",
    title: `Product ${variantId}`,
    variantId,
    variantTitle,
  })
}

const renderSummary = () =>
  renderWithProviders(
    <CheckoutFormProvider>
      <CheckoutSummary />
    </CheckoutFormProvider>,
  )

const chooseDeliveryMethod = (deliveryMethod: string): void => {
  sessionStorage.setItem("marte-checkout-draft", JSON.stringify({ v: 1, values: { deliveryMethod } }))
}

beforeEach(() => {
  sessionStorage.clear()
  useCartStore.getState().clearCart()
})

afterEach(() => {
  cleanup()
  useCartStore.getState().clearCart()
})

describe("CheckoutSummary", () => {
  it("counts the products in the cart", () => {
    addLine({ qty: 3, rawPrice: 24_900, variantId: "variant-a" })
    renderSummary()

    expect(screen.getByText("Products (3)")).toBeInTheDocument()
  })

  it("totals the cart lines as the subtotal and repeats it as the total", () => {
    addLine({ qty: 3, rawPrice: 24_900, variantId: "variant-a" })
    renderSummary()

    expect(screen.getAllByText("PLN 747.00")).toHaveLength(2)
  })

  it("says the delivery cost is still unknown before a method is chosen", () => {
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    renderSummary()

    expect(screen.getByText("Calculated at next step")).toBeInTheDocument()
  })

  it("adds nothing to the total for delivery until a method is chosen", () => {
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    renderSummary()

    expect(screen.getAllByText("PLN 249.00")).toHaveLength(2)
  })

  it("lists each cart line with its quantity and unit price", () => {
    addLine({ qty: 2, rawPrice: 24_900, variantId: "variant-a" })
    addLine({ qty: 1, rawPrice: 18_900, variantId: "variant-b", variantTitle: "" })
    renderSummary()

    expect(screen.getByText("2 x PLN 249.00")).toBeInTheDocument()
    expect(screen.getByText("1 x PLN 189.00")).toBeInTheDocument()
  })

  it("shows a variant name only when the line has one", () => {
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    addLine({ qty: 1, rawPrice: 18_900, variantId: "variant-b", variantTitle: "" })
    renderSummary()

    expect(screen.getByText("Rozmiar M")).toBeInTheDocument()
    expect(screen.getAllByRole("img")).toHaveLength(2)
  })

  it("falls back to parsing the display price when the raw price is unusable", () => {
    useCartStore.getState().addItem({
      id: "line-fallback",
      image: "bracelet.jpg",
      price: "249,00",
      qty: 1,
      rawPrice: 0,
      slug: "bransoletka-aurora",
      title: "Fallback line",
      variantId: "variant-fallback",
      variantTitle: "",
    })
    renderSummary()

    expect(screen.getByText("1 x PLN 249.00")).toBeInTheDocument()
  })

  it("labels the subtotal, the delivery and the total", () => {
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    renderSummary()

    expect(screen.getByText("Products (1)")).toBeInTheDocument()
    expect(screen.getByText("Delivery")).toBeInTheDocument()
    expect(screen.getByText("Total")).toBeInTheDocument()
  })

  it("shows an empty cart as zero without any line", () => {
    renderSummary()

    expect(screen.getByText("Products (0)")).toBeInTheDocument()
    expect(screen.getAllByText("PLN 0.00")).toHaveLength(2)
    expect(screen.queryAllByRole("img")).toStrictEqual([])
  })
})

describe("CheckoutSummary delivery cost", () => {
  it("prices the delivery method the shopper picked", async () => {
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    chooseDeliveryMethod("courier")
    renderSummary()

    expect(await screen.findByText("PLN 19.00")).toBeInTheDocument()
  })

  it("adds the delivery cost to the total", async () => {
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    chooseDeliveryMethod("courier")
    renderSummary()

    expect(await screen.findByText("PLN 268.00")).toBeInTheDocument()
  })

  it("calls a delivery method that costs nothing free", async () => {
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    chooseDeliveryMethod("pickup")
    renderSummary()

    expect(await screen.findByText("Free")).toBeInTheDocument()
    expect(screen.queryByText("Calculated at next step")).toBeNull()
  })

  it("leaves the total untouched by a delivery method that costs nothing", async () => {
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    chooseDeliveryMethod("pickup")
    renderSummary()

    await screen.findByText("Free")

    expect(screen.getAllByText("PLN 249.00")).toHaveLength(2)
  })
})

describe("CheckoutSummary discount code", () => {
  it("offers a code field alongside the totals", () => {
    renderSummary()

    expect(screen.getByLabelText("Discount code")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument()
  })

  it("states the VAT contained in the total", () => {
    renderSummary()

    expect(screen.getByText(/Includes VAT \(23%\)/u)).toBeInTheDocument()
  })

  it("takes an accepted code off the total and shows what it saved", async () => {
    validateDiscountCode.mockResolvedValue({ applied: { amountMinorUnits: 5000, code: "SPRING", discountId: "d-1", type: "fixed_amount" } })
    renderSummary()

    fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: "spring" } })
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(await screen.findByText("SPRING")).toBeInTheDocument()
    expect(screen.getByText("Discount")).toBeInTheDocument()
  })

  it("explains a rejected code without applying anything", async () => {
    validateDiscountCode.mockResolvedValue({ rejection: "expired" })
    renderSummary()

    fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: "OLD" } })
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(await screen.findByText("That code has expired.")).toBeInTheDocument()
    expect(screen.queryByText("Discount")).not.toBeInTheDocument()
  })

  it("lets the shopper take an applied code back off", async () => {
    validateDiscountCode.mockResolvedValue({ applied: { amountMinorUnits: 5000, code: "SPRING", discountId: "d-1", type: "fixed_amount" } })
    renderSummary()

    fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: "SPRING" } })
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))
    fireEvent.click(await screen.findByRole("button", { name: "Remove discount code" }))

    expect(screen.getByLabelText("Discount code")).toBeInTheDocument()
    expect(screen.queryByText("Discount")).not.toBeInTheDocument()
  })
})
