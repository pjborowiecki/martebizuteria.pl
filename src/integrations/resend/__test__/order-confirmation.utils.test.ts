import { describe, expect, it, vi } from "vite-plus/test"

const { env, paymentIntentsRetrieve } = vi.hoisted(() => ({
  env: {},
  paymentIntentsRetrieve: vi.fn(),
}))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { paymentIntents: { retrieve: paymentIntentsRetrieve } },
}))
vi.mock("~/src/lib/image", () => ({ PLACEHOLDER_IMAGE: "https://assets.test/placeholder.svg" }))
vi.mock("~/src/lib/url", () => ({
  getBaseURL: () => "https://fallback.test",
  resolveAssetURL: (src: string) => `https://assets.test/${src}`,
}))

import {
  type CheckoutEmailContext,
  buildOrderAccountCta,
  buildOrderConfirmationDetails,
  buildOrderConfirmationItems,
  formatEmailAddress,
} from "~/src/integrations/resend/order-confirmation.utils"

import { APP_URL } from "~/src/presentation/branding/app"

import englishCopy from "~/messages/en-US/emails.order-confirmation.json"
import polishCopy from "~/messages/pl-PL/emails.order-confirmation.json"

const addressRow = {
  address1: "Krucza 1",
  address2: "m. 4",
  city: "Warszawa",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48123456789",
  postalCode: "00-001",
}

const context: CheckoutEmailContext = {
  billingAddress: null,
  billingAddressId: "address-1",
  customerNote: null,
  deliveryMethod: { name: "Kurier", type: "courier" },
  lockerId: null,
  shippingAddress: addressRow,
  shippingAddressId: "address-1",
}

describe("formatEmailAddress", () => {
  it.each([[null], [undefined]])("reports nothing for %j", (row) => {
    expect(formatEmailAddress(row)).toBeUndefined()
  })

  it("lays the address out one part per line", () => {
    expect(formatEmailAddress(addressRow)).toBe("Anna Kowalska\nKrucza 1\nm. 4\n00-001 Warszawa\nPL\n+48123456789")
  })

  it("omits the lines that are missing", () => {
    expect(formatEmailAddress({ ...addressRow, address2: null, firstName: null, lastName: null, phone: null, postalCode: null })).toBe(
      "Krucza 1\nWarszawa\nPL",
    )
  })

  it("keeps a single name part", () => {
    expect(formatEmailAddress({ ...addressRow, lastName: null })).toContain("Anna\n")
  })

  it("reports no printable address when the row contains only empty or whitespace fields", () => {
    expect(
      formatEmailAddress({
        address1: "  ",
        address2: null,
        city: "",
        countryCode: "",
        firstName: "",
        lastName: null,
        phone: null,
        postalCode: "",
      }),
    ).toBeUndefined()
  })
})

describe("buildOrderConfirmationDetails", () => {
  it("renders the shipping address and delivery method from the checkout", () => {
    const details = buildOrderConfirmationDetails(context, "Card", englishCopy)

    expect(details.deliveryMethod).toBe("Kurier")
    expect(details.paymentMethod).toBe("Card")
    expect(details.shippingAddress).toContain("Krucza 1")
  })

  it("notes that billing matches shipping when both point at the same address", () => {
    expect(buildOrderConfirmationDetails(context, "Card", englishCopy).billingAddress).toBe(englishCopy.billingSameAsShipping)
  })

  it("renders a separate billing address when there is one", () => {
    const withBilling: CheckoutEmailContext = {
      ...context,
      billingAddress: { ...addressRow, city: "Kraków" },
      billingAddressId: "address-2",
    }

    expect(buildOrderConfirmationDetails(withBilling, "Card", englishCopy).billingAddress).toContain("Kraków")
  })

  it("falls back to the unavailable copy when the checkout context is missing", () => {
    const details = buildOrderConfirmationDetails(undefined, "Card", englishCopy)

    expect(details.billingAddress).toBe(englishCopy.unavailable)
    expect(details.deliveryMethod).toBe(englishCopy.unavailable)
    expect(details.shippingAddress).toBe(englishCopy.unavailable)
  })

  it("falls back to the unavailable copy when the billing address row was not loaded", () => {
    const withoutBillingRow: CheckoutEmailContext = { ...context, billingAddress: null, billingAddressId: "address-2" }

    expect(buildOrderConfirmationDetails(withoutBillingRow, "Card", englishCopy).billingAddress).toBe(englishCopy.unavailable)
  })

  it("appends the locker code to a locker delivery", () => {
    const locker: CheckoutEmailContext = { ...context, deliveryMethod: { name: "Paczkomat", type: "locker" }, lockerId: " WAW01A " }

    expect(buildOrderConfirmationDetails(locker, "Card", englishCopy).deliveryMethod).toBe("Paczkomat · WAW01A")
  })

  it("leaves the locker name alone when no code was captured", () => {
    const locker: CheckoutEmailContext = { ...context, deliveryMethod: { name: "Paczkomat", type: "locker" }, lockerId: "  " }

    expect(buildOrderConfirmationDetails(locker, "Card", englishCopy).deliveryMethod).toBe("Paczkomat")
  })

  it.each([["courier"], ["locker"], ["in_store"]] as const)("uses the %s delivery timings", (type) => {
    const details = buildOrderConfirmationDetails({ ...context, deliveryMethod: { name: "Method", type } }, "Card", englishCopy)

    expect(details.fulfillmentTime).toBe(englishCopy.deliveryTiming[type].fulfillmentTime)
    expect(details.estimatedDelivery).toBe(englishCopy.deliveryTiming[type].estimatedDelivery)
  })

  it("assumes courier timings when the delivery method was not loaded", () => {
    const details = buildOrderConfirmationDetails({ ...context, deliveryMethod: null }, "Card", englishCopy)

    expect(details.fulfillmentTime).toBe(englishCopy.deliveryTiming.courier.fulfillmentTime)
  })

  it("renders the Polish copy for a Polish order", () => {
    expect(buildOrderConfirmationDetails(undefined, "Karta", polishCopy).billingAddress).toBe(polishCopy.unavailable)
  })
})

describe("buildOrderConfirmationItems", () => {
  const lines = [
    { handle: "srebrny-pierscionek", imageUrl: "products/ring.jpg", price: 12_000, qty: 2, title: "Silver ring", variantId: "v1" },
  ]

  it("carries the line copy and quantities through", () => {
    expect(buildOrderConfirmationItems(lines, "pl-PL")[0]).toMatchObject({ price: 12_000, qty: 2, title: "Silver ring" })
  })

  it("resolves the line image against the asset host", () => {
    expect(buildOrderConfirmationItems(lines, "pl-PL")[0]?.imageUrl).toBe("https://assets.test/products/ring.jpg")
  })

  it.each([[undefined], [""]])("falls back to the placeholder for the image %j", (imageUrl) => {
    expect(
      buildOrderConfirmationItems([{ ...lines[0], imageUrl, price: 1, qty: 1, title: "t", variantId: "v" }], "pl-PL")[0]?.imageUrl,
    ).toBe("https://assets.test/placeholder.svg")
  })

  it("links to the product page in the shopper's locale", () => {
    expect(buildOrderConfirmationItems(lines, "pl-PL")[0]?.productUrl).toBe(`${APP_URL}/products/srebrny-pierscionek`)
    expect(buildOrderConfirmationItems(lines, "en-US")[0]?.productUrl).toBe(`${APP_URL}/en-US/products/srebrny-pierscionek`)
  })

  it.each([[undefined], [""]])("falls back to the catalog page when the handle is %j", (handle) => {
    expect(
      buildOrderConfirmationItems([{ ...lines[0], handle, price: 1, qty: 1, title: "t", variantId: "v" }], "pl-PL")[0]?.productUrl,
    ).toBe(`${APP_URL}/products`)
  })

  it("produces nothing for an order with no lines", () => {
    expect(buildOrderConfirmationItems([], "pl-PL")).toStrictEqual([])
  })
})

describe("buildOrderAccountCta", () => {
  it("invites a guest to create an account", () => {
    expect(buildOrderAccountCta({ isGuest: true, locale: "en-US", messages: englishCopy, orderId: "order-1" })).toStrictEqual({
      href: `${APP_URL}/en-US/auth/sign-up`,
      isGuest: true,
      label: englishCopy.createAccountCta,
    })
  })

  it("links a signed-in shopper straight to the order", () => {
    expect(buildOrderAccountCta({ isGuest: false, locale: "en-US", messages: englishCopy, orderId: "order-1" })).toStrictEqual({
      href: `${APP_URL}/en-US/account/orders/order-1`,
      isGuest: false,
      label: englishCopy.viewOrderCta,
    })
  })

  it("leaves the default locale unprefixed", () => {
    expect(buildOrderAccountCta({ isGuest: false, locale: "pl-PL", messages: polishCopy, orderId: "order-1" }).href).toBe(
      `${APP_URL}/account/orders/order-1`,
    )
  })
})
