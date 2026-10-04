import { type JSX, type ReactNode } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { getDiscountByCodeForCustomerQuery, search } = vi.hoisted(() => ({
  getDiscountByCodeForCustomerQuery:
    vi.fn<(code: string, email: string | undefined) => Promise<Discount["selectForCustomer"] | undefined>>(),
  search: { step: 1 },
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
vi.mock("~/src/modules/discount/discount.accessors", () => ({ getDiscountByCodeForCustomerQuery }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: () => Promise.resolve(undefined) }))
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => vi.fn(), useSearch: () => search }
})

import { useCartStore } from "~/src/modules/cart/cart.store"
import { type Discount } from "~/src/modules/discount/discount.types"

import { CheckoutTextField } from "~/src/presentation/components/custom/checkout/components/checkout-fields"
import { CheckoutFormProvider, useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
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

const EmailField = (): JSX.Element => {
  const { control } = useCheckoutForm()

  return <CheckoutTextField control={control} label="Email" name="email" />
}

const renderSummary = (field?: ReactNode) =>
  renderWithProviders(
    <CheckoutFormProvider>
      {field}
      <CheckoutSummary />
    </CheckoutFormProvider>,
  )

const applyCode = (code: string): void => {
  fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: code } })
  fireEvent.click(screen.getByRole("button", { name: "Apply" }))
}

const restoreDraft = (values: Readonly<Record<string, string>>): void => {
  sessionStorage.setItem("marte-checkout-draft", JSON.stringify({ v: 1, values }))
}

const chooseDeliveryMethod = (deliveryMethod: string): void => {
  restoreDraft({ deliveryMethod })
}

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

beforeEach(() => {
  vi.clearAllMocks()
  search.step = 1
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
    getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow())
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    renderSummary()

    applyCode("spring")

    expect(await screen.findByText("SPRING")).toBeInTheDocument()
    expect(screen.getByText("Discount")).toBeInTheDocument()
    expect(screen.getByText("PLN 199.00")).toBeInTheDocument()
  })

  it("explains a rejected code without applying anything", async () => {
    getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow({ code: "OLD", endsAt: new Date("2026-02-01T00:00:00.000Z") }))
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    renderSummary()

    applyCode("OLD")

    expect(await screen.findByText("That code has expired.")).toBeInTheDocument()
    expect(screen.queryByText("Discount")).not.toBeInTheDocument()
  })

  it("lets the shopper take an applied code back off", async () => {
    getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow())
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    renderSummary()

    applyCode("SPRING")
    fireEvent.click(await screen.findByRole("button", { name: "Remove discount code" }))

    expect(screen.getByLabelText("Discount code")).toBeInTheDocument()
    expect(screen.queryByText("Discount")).not.toBeInTheDocument()
    expect(screen.getAllByText("PLN 249.00")).toHaveLength(2)
  })

  it("asks the server every time Apply is pressed and shows that answer without asking twice", async () => {
    getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow())
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    renderSummary()

    applyCode("SPRING")
    fireEvent.click(await screen.findByRole("button", { name: "Remove discount code" }))
    applyCode("SPRING")

    expect(await screen.findByText("PLN 199.00")).toBeInTheDocument()
    expect(getDiscountByCodeForCustomerQuery).toHaveBeenCalledTimes(2)
  })

  it("explains a code it could not check when Apply is pressed", async () => {
    getDiscountByCodeForCustomerQuery.mockRejectedValue(new Error("D1 unavailable"))
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    renderSummary()

    applyCode("SPRING")

    expect(await screen.findByText("We could not check that code. Please try again.")).toBeInTheDocument()
    expect(screen.getAllByText("PLN 249.00")).toHaveLength(2)
  })
})

describe("CheckoutSummary restored discount code", () => {
  it("keeps a restored code on the total after the page reloads", async () => {
    getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow())
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    restoreDraft({ deliveryMethod: "courier", discountCode: "SPRING" })
    renderSummary()

    expect(await screen.findByText("Discount")).toBeInTheDocument()
    expect(screen.getByText("SPRING")).toBeInTheDocument()
    expect(screen.getByText("PLN 218.00")).toBeInTheDocument()
  })

  it("prices a free-delivery code with the delivery the shopper chose", async () => {
    getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow({ code: "SHIPFREE", type: "free_shipping", value: 0 }))
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    restoreDraft({ deliveryMethod: "courier", discountCode: "SHIPFREE" })
    renderSummary()

    expect(await screen.findAllByText("−PLN 19.00")).toHaveLength(2)
    expect(screen.getAllByText("PLN 249.00")).toHaveLength(2)
  })

  it("keeps a restored code that no longer applies on screen with the reason", async () => {
    getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow({ endsAt: new Date("2026-02-01T00:00:00.000Z") }))
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    restoreDraft({ discountCode: "SPRING" })
    renderSummary()

    expect(await screen.findByText("That code has expired.")).toBeInTheDocument()
    expect(screen.getByText("SPRING")).toBeInTheDocument()
    expect(screen.queryByText("Discount")).not.toBeInTheDocument()
    expect(screen.getAllByText("PLN 249.00")).toHaveLength(2)
  })

  it("holds back the total and says so when the code cannot be checked", async () => {
    getDiscountByCodeForCustomerQuery.mockRejectedValueOnce(new Error("D1 unavailable")).mockResolvedValue(discountRow())
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    restoreDraft({ discountCode: "SPRING" })
    renderSummary()

    expect(await screen.findByText("We could not check that code, so the total is not final yet.")).toBeInTheDocument()
    expect(screen.getByText("Awaiting code check")).toBeInTheDocument()
    expect(screen.getAllByText("PLN 249.00")).toHaveLength(1)
    expect(screen.queryByText(/Includes VAT/u)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(await screen.findByText("PLN 199.00")).toBeInTheDocument()
    expect(screen.queryByText("Awaiting code check")).not.toBeInTheDocument()
  })
})

describe("CheckoutSummary discount code and the shopper's email", () => {
  it("checks the code without the email while the shopper is still on the contact step", async () => {
    getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow())
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    restoreDraft({ discountCode: "SPRING", email: "ada@marte.test", phone: "+48512345678" })
    renderSummary()

    expect(await screen.findByText("Discount")).toBeInTheDocument()
    expect(getDiscountByCodeForCustomerQuery).toHaveBeenCalledExactlyOnceWith("SPRING", undefined)
  })

  it("does not check the code again while the shopper types an email", async () => {
    getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow())
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    restoreDraft({ discountCode: "SPRING" })
    renderSummary(<EmailField />)

    await screen.findByText("Discount")
    for (const email of ["a", "ad", "ada@", "ada@marte.te", "ada@marte.test"]) {
      fireEvent.change(screen.getByLabelText(/Email/u), { target: { value: email } })
    }

    expect(screen.getByText("Discount")).toBeInTheDocument()
    expect(getDiscountByCodeForCustomerQuery).toHaveBeenCalledOnce()
  })

  it("withholds a code the confirmed email has already used, with the reason", async () => {
    search.step = 2
    getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow({ perCustomerLimit: 1, redeemedByCustomer: 1 }))
    addLine({ qty: 1, rawPrice: 24_900, variantId: "variant-a" })
    restoreDraft({ discountCode: "SPRING", email: "ada@marte.test", phone: "+48512345678" })
    renderSummary()

    expect(await screen.findByText("You have already used that code.")).toBeInTheDocument()
    expect(getDiscountByCodeForCustomerQuery).toHaveBeenCalledExactlyOnceWith("SPRING", "ada@marte.test")
    expect(screen.queryByText("Discount")).not.toBeInTheDocument()
    expect(screen.getAllByText("PLN 249.00")).toHaveLength(2)
  })
})
