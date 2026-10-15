import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type Order } from "~/src/modules/order/order.types"

const { getOrderConfirmation } = vi.hoisted(() => ({
  getOrderConfirmation: vi.fn<() => Promise<Order["confirmation"] | undefined>>(),
}))

vi.mock("~/src/modules/customer-activity/use-cases/record-customer-activity", () => ({ recordCustomerActivity: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/get-order-confirmation", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getOrderConfirmationQuery: (sessionId: string) =>
      queryOptions({
        queryFn: getOrderConfirmation,
        queryKey: ["order", "confirmation", sessionId],
      }),
  }
})
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { useCartStore } from "~/src/modules/cart/cart.store"
import { CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY } from "~/src/modules/customer-activity/customer-activity.constants"

import { CheckoutSuccess } from "~/src/presentation/components/custom/checkout/components/checkout-success"
import {
  forgetCheckoutSessionId,
  loadCheckoutDraft,
  loadCheckoutSessionId,
  saveCheckoutDraft,
  saveCheckoutSession,
} from "~/src/presentation/components/custom/checkout/lib/checkout-draft"

const SESSION_ID = "cs_test_123"

const PAID_LINES = [{ qty: 1, variantId: "variant-1" }]

const confirmation = (overrides: Partial<Order["confirmation"]> = {}): Order["confirmation"] => ({
  createdAt: new Date("2026-03-14T10:00:00.000Z"),
  currencyCode: "PLN",
  deliveryMethodName: "Paczkomat InPost",
  discountTotalMinorUnits: 0,
  email: "anna@example.com",
  id: "a1b2c3d4-0000-0000-0000-000000000000",
  isGuestOrder: false,
  isOwnOrder: true,
  items: [
    {
      id: "item-1",
      imageUrl: undefined,
      productHandle: "bransoletka-aurora",
      quantity: 2,
      sku: "AUR-01",
      title: "Bransoletka Aurora",
      totalMinorUnits: 49_800,
      unitPriceMinorUnits: 24_900,
      variantTitle: "Rozmiar M",
    },
  ],
  locker: undefined,
  orderNumber: "MRT-2026-00042",
  shippingAddress: {
    city: "Warszawa",
    countryCode: "PL",
    line1: "ul. Mokotowska 12/4",
    line2: undefined,
    name: "Anna Kowalska",
    phone: undefined,
    postalCode: "00-640",
    province: undefined,
  },
  shippingTotalMinorUnits: 1499,
  subtotalMinorUnits: 49_800,
  taxBasisPoints: 2300,
  taxTotalMinorUnits: 9587,
  totalMinorUnits: 51_299,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  getOrderConfirmation.mockResolvedValue(confirmation())
  useCartStore.getState().addItem({
    id: "line-1",
    image: "",
    price: "249,00 zł",
    rawPrice: 24_900,
    slug: "bransoletka-aurora",
    title: "Bransoletka Aurora",
    variantId: "variant-1",
    variantTitle: "Rozmiar M",
  })
  saveCheckoutSession({ lines: PAID_LINES, sessionId: SESSION_ID })
})

afterEach(() => {
  cleanup()
  useCartStore.getState().clearCart()
})

describe("CheckoutSuccess", () => {
  it("confirms the order and names the address the receipt went to", async () => {
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByRole("heading", { name: "Order Confirmed" })).toBeInTheDocument()
    expect(screen.getByText(/anna@example\.com/u)).toBeInTheDocument()
  })

  it("does not promise a confirmation email the page cannot know was sent", async () => {
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(
      await screen.findByText(
        "Thank you for your purchase. If the confirmation email has not reached anna@example.com within a few minutes, contact us and quote the order number below.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/on its way/u)).toBeNull()
  })

  it("shows the order number the customer can quote to support", async () => {
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("MRT-2026-00042")).toBeInTheDocument()
  })

  it("itemises what was bought with its quantity", async () => {
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("Bransoletka Aurora")).toBeInTheDocument()
    expect(screen.getByText("Rozmiar M")).toBeInTheDocument()
    expect(screen.getByText("× 2")).toBeInTheDocument()
  })

  it("breaks the money down and states the VAT contained in the total", async () => {
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("Subtotal")).toBeInTheDocument()
    expect(screen.getByText("Paczkomat InPost")).toBeInTheDocument()
    expect(screen.getByText(/Includes VAT \(23%\)/u)).toBeInTheDocument()
  })

  it("repeats the delivery address so the buyer can spot a mistake at once", async () => {
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("ul. Mokotowska 12/4")).toBeInTheDocument()
    expect(screen.getByText("00-640 Warszawa")).toBeInTheDocument()
  })

  it("links a signed-in customer straight to the order in their account", async () => {
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    const orderLink = await screen.findByRole("link", { name: "View your order" })

    expect(orderLink.getAttribute("href")).toBe("/account/orders/a1b2c3d4-0000-0000-0000-000000000000")
  })

  it("invites a guest to create an account that will adopt the order", async () => {
    getOrderConfirmation.mockResolvedValue(confirmation({ isGuestOrder: true, isOwnOrder: false }))
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText(/Create an account with anna@example\.com/u)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Create an account" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "View your order" })).not.toBeInTheDocument()
  })

  it("shows a discount line only when the order carries one", async () => {
    getOrderConfirmation.mockResolvedValue(confirmation({ discountTotalMinorUnits: 5000 }))
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("Discount")).toBeInTheDocument()
  })

  it("says it is still confirming while the webhook catches up", () => {
    getOrderConfirmation.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(screen.getByRole("heading", { name: "Confirming your payment" })).toBeInTheDocument()
  })

  it("explains itself rather than looking broken when the order cannot be found", async () => {
    getOrderConfirmation.mockResolvedValue(undefined)
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByRole("heading", { name: "We could not load this order" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Your payment may still have gone through. Check your inbox for a confirmation, or contact us and we will look it up.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Return to store" })).toBeInTheDocument()
  })

  it("empties the cart that still holds what the session paid for", async () => {
    expect(useCartStore.getState().items).toHaveLength(1)

    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    await waitFor(() => {
      expect(useCartStore.getState().items).toStrictEqual([])
    })
    expect(useCartStore.getState().itemCount()).toBe(0)
    expect(loadCheckoutSessionId()).toBeUndefined()
  })

  it("empties the cart once its pieces have loaded from storage", async () => {
    const { items } = useCartStore.getState()
    useCartStore.setState({ items: [] })
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)
    expect(loadCheckoutSessionId()).toBe(SESSION_ID)

    act(() => {
      useCartStore.setState({ items })
    })

    await waitFor(() => {
      expect(useCartStore.getState().items).toStrictEqual([])
    })
    expect(loadCheckoutSessionId()).toBeUndefined()
  })

  it("discards the saved checkout draft so the next order starts clean", async () => {
    saveCheckoutDraft({ city: "Warszawa", email: "anna@example.com" })
    expect(loadCheckoutDraft()).toStrictEqual({ city: "Warszawa", email: "anna@example.com" })

    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    await waitFor(() => {
      expect(loadCheckoutDraft()).toBeUndefined()
    })
  })

  it("resets the abandoned cart reminder so a new cart can trigger it again", async () => {
    sessionStorage.setItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY, "1")

    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    await waitFor(() => {
      expect(sessionStorage.getItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY)).toBeNull()
    })
  })
})

describe("CheckoutSuccess status mark", () => {
  it("shows the success mark beside an order it loaded", async () => {
    const { container } = renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByRole("heading", { name: "Order Confirmed" })).toBeInTheDocument()
    expect(container.querySelector(".text-success")).not.toBeNull()
  })

  it("shows no success mark when the order cannot be loaded", async () => {
    getOrderConfirmation.mockResolvedValue(undefined)
    const { container } = renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByRole("heading", { name: "We could not load this order" })).toBeInTheDocument()
    expect(container.querySelector(".text-success")).toBeNull()
  })
})

describe("CheckoutSuccess for screen readers", () => {
  it("announces the confirmed order in the status region that announced the wait", async () => {
    const pending = Promise.withResolvers<ReturnType<typeof confirmation>>()
    getOrderConfirmation.mockReturnValue(pending.promise)
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Confirming your payment")

    pending.resolve(confirmation())

    await waitFor(() => {
      expect(status).toHaveTextContent("Order Confirmed")
    })
  })

  it("announces in the same status region that the order could not be loaded", async () => {
    getOrderConfirmation.mockResolvedValue(undefined)
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("We could not load this order")
    })
  })
})

describe("CheckoutSuccess reopened after the basket moved on", () => {
  it.each([
    {
      heldSessionId: SESSION_ID,
      hold: () => {
        saveCheckoutSession({ lines: [{ qty: 1, variantId: "variant-2" }], sessionId: SESSION_ID })
      },
      why: "the session paid for other pieces than the basket holds now",
    },
    {
      heldSessionId: undefined,
      hold: () => {
        forgetCheckoutSessionId(SESSION_ID)
      },
      why: "the browser no longer holds the session",
    },
    {
      heldSessionId: "cs_test_newer",
      hold: () => {
        saveCheckoutSession({ lines: PAID_LINES, sessionId: "cs_test_newer" })
      },
      why: "the browser holds a newer checkout for the basket",
    },
  ])("shows the order and leaves the basket, the draft and the reminder alone when $why", async ({ heldSessionId, hold }) => {
    hold()
    saveCheckoutDraft({ email: "anna@example.com" })
    sessionStorage.setItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY, "1")

    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("MRT-2026-00042")).toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(loadCheckoutDraft()).toStrictEqual({ email: "anna@example.com" })
    expect(sessionStorage.getItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY)).toBe("1")
    expect(loadCheckoutSessionId()).toBe(heldSessionId)
  })
})

describe("CheckoutSuccess order details", () => {
  const [item] = confirmation().items

  it("shows the product photo when the line kept one", async () => {
    if (item === undefined) {
      throw new Error("expected the confirmation fixture to carry a line")
    }
    getOrderConfirmation.mockResolvedValue(confirmation({ items: [{ ...item, imageUrl: "https://assets.test/products/aurora.webp" }] }))
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByRole("img", { name: "Bransoletka Aurora" })).toHaveAttribute(
      "src",
      "https://assets.test/products/aurora.webp",
    )
  })

  it("shows a placeholder instead of a broken photo when the line has none", async () => {
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("Bransoletka Aurora")).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "Bransoletka Aurora" })).not.toBeInTheDocument()
  })

  it("labels the delivery cost generically when the order kept no method name", async () => {
    getOrderConfirmation.mockResolvedValue(confirmation({ deliveryMethodName: undefined }))
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("Shipping")).toBeInTheDocument()
    expect(screen.queryByText("Paczkomat InPost")).not.toBeInTheDocument()
  })

  it("repeats the second address line and drops a postal code the address never had", async () => {
    getOrderConfirmation.mockResolvedValue(
      confirmation({
        shippingAddress: {
          city: "Dublin",
          countryCode: "IE",
          line1: "12 Grafton Street",
          line2: "Apartment 4",
          name: "Anna Kowalska",
          phone: undefined,
          postalCode: undefined,
          province: undefined,
        },
      }),
    )
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("Apartment 4")).toBeInTheDocument()
    expect(screen.getByText("Dublin")).toBeInTheDocument()
  })

  it("sends a locker order to the locker, with its code and the address it kept, not to the customer's address", async () => {
    getOrderConfirmation.mockResolvedValue(
      confirmation({
        locker: {
          code: "WAW01M",
          point: { buildingNumber: "1", city: "Warszawa", description: "Przy Żabce", postalCode: "00-001", street: "Marszałkowska" },
        },
      }),
    )
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("Collect from parcel locker")).toBeInTheDocument()
    expect(screen.getByText("WAW01M")).toBeInTheDocument()
    expect(screen.getByText("Przy Żabce")).toBeInTheDocument()
    expect(screen.getByText("Marszałkowska 1")).toBeInTheDocument()
    expect(screen.queryByText("ul. Mokotowska 12/4")).not.toBeInTheDocument()
  })

  it("names a locker an older order kept only by its code", async () => {
    getOrderConfirmation.mockResolvedValue(confirmation({ locker: { code: "WAW01M", point: undefined } }))
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("WAW01M")).toBeInTheDocument()
    expect(screen.queryByText("Shipping to")).not.toBeInTheDocument()
  })

  it("leaves the shipping block out when the order kept no address", async () => {
    getOrderConfirmation.mockResolvedValue(confirmation({ shippingAddress: undefined }))
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByText("MRT-2026-00042")).toBeInTheDocument()
    expect(screen.queryByText("Shipping to")).not.toBeInTheDocument()
  })
})

describe("CheckoutSuccess actions for someone else's order", () => {
  it("offers only the way back to the store to a signed-in visitor who did not place the order", async () => {
    getOrderConfirmation.mockResolvedValue(confirmation({ isGuestOrder: false, isOwnOrder: false }))
    renderWithProviders(<CheckoutSuccess sessionId={SESSION_ID} />)

    expect(await screen.findByRole("link", { name: "Return to store" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "View your order" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument()
    expect(screen.queryByText(/Create an account with/u)).not.toBeInTheDocument()
  })
})
