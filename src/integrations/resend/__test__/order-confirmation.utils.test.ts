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
  buildOrderLegalLinks,
  describeCompanyInvoice,
  formatEmailAddress,
} from "~/src/integrations/resend/order-confirmation.utils"

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
  billingCompanyName: null,
  billingNip: null,
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

describe("describeCompanyInvoice", () => {
  it("puts the company name above its NIP", () => {
    expect(describeCompanyInvoice({ billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246" }, "NIP")).toBe(
      "Pracownia Złotnicza sp. z o.o.\nNIP 5260001246",
    )
  })

  it("keeps whichever of the two was recorded", () => {
    expect(describeCompanyInvoice({ billingCompanyName: "Pracownia Złotnicza", billingNip: null }, "NIP")).toBe("Pracownia Złotnicza")
    expect(describeCompanyInvoice({ billingCompanyName: "  ", billingNip: "5260001246" }, "NIP")).toBe("NIP 5260001246")
  })

  it("reports no company when the customer did not ask for an invoice", () => {
    expect(describeCompanyInvoice({ billingCompanyName: null, billingNip: null }, "NIP")).toBeUndefined()
    expect(describeCompanyInvoice({ billingCompanyName: null, billingNip: " " }, "NIP")).toBeUndefined()
  })
})

describe("buildOrderConfirmationDetails", () => {
  const ringWithoutStatedTime = [{ time: undefined, title: "Silver ring" }]

  const detailsFor = (checkout: CheckoutEmailContext | undefined, messages = englishCopy, paymentMethod = "Card") =>
    buildOrderConfirmationDetails({ context: checkout, fulfillmentTimes: ringWithoutStatedTime, messages, paymentMethod })

  it("renders the shipping address and delivery method from the checkout", () => {
    const details = detailsFor(context)

    expect(details.deliveryMethod).toBe("Kurier")
    expect(details.paymentMethod).toBe("Card")
    expect(details.shippingAddress).toContain("Krucza 1")
  })

  it("notes that billing matches shipping when both point at the same address", () => {
    expect(detailsFor(context).billingAddress).toBe(englishCopy.billingSameAsShipping)
  })

  it("renders a separate billing address when there is one", () => {
    const withBilling: CheckoutEmailContext = {
      ...context,
      billingAddress: { ...addressRow, city: "Kraków" },
      billingAddressId: "address-2",
    }

    expect(detailsFor(withBilling).billingAddress).toContain("Kraków")
  })

  it("names the company to invoice from the checkout, and none when the customer did not ask for one", () => {
    expect(detailsFor({ ...context, billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246" }).companyInvoice).toBe(
      `Pracownia Złotnicza sp. z o.o.\n${englishCopy.nipLabel} 5260001246`,
    )
    expect(detailsFor(context).companyInvoice).toBeUndefined()
  })

  it("falls back to the unavailable copy when the checkout context is missing", () => {
    const details = detailsFor(undefined)

    expect(details.companyInvoice).toBeUndefined()
    expect(details.billingAddress).toBe(englishCopy.unavailable)
    expect(details.deliveryMethod).toBe(englishCopy.unavailable)
    expect(details.shippingAddress).toBe(englishCopy.unavailable)
  })

  it("falls back to the unavailable copy when the billing address row was not loaded", () => {
    const withoutBillingRow: CheckoutEmailContext = { ...context, billingAddress: null, billingAddressId: "address-2" }

    expect(detailsFor(withoutBillingRow).billingAddress).toBe(englishCopy.unavailable)
  })

  it("appends the locker code to a locker delivery", () => {
    const locker: CheckoutEmailContext = { ...context, deliveryMethod: { name: "Paczkomat", type: "locker" }, lockerId: " WAW01A " }

    expect(detailsFor(locker).deliveryMethod).toBe("Paczkomat · WAW01A")
  })

  it("leaves the locker name alone when no code was captured", () => {
    const locker: CheckoutEmailContext = { ...context, deliveryMethod: { name: "Paczkomat", type: "locker" }, lockerId: "  " }

    expect(detailsFor(locker).deliveryMethod).toBe("Paczkomat")
  })

  it.each([["courier"], ["locker"], ["in_store"]] as const)("promises the %s delivery time", (type) => {
    const details = detailsFor({ ...context, deliveryMethod: { name: "Method", type } })

    expect(details.estimatedDelivery).toBe(englishCopy.estimatedDelivery[type])
  })

  it.each([["courier"], ["locker"], ["in_store"]] as const)(
    "states the fulfillment time of § 7 for a product page without one for %s delivery",
    (type) => {
      const details = detailsFor({ ...context, deliveryMethod: { name: "Method", type } }, polishCopy, "Karta")

      expect(details.fulfillmentTime).toBe(`${polishCopy.fulfillmentTime.fallback}\n${polishCopy.fulfillmentTime.note}`)
    },
  )

  it("states the longest fulfillment time among the products ordered", () => {
    const details = buildOrderConfirmationDetails({
      context,
      fulfillmentTimes: [
        { time: "3 tygodnie", title: "Pierścionek Luna" },
        { time: undefined, title: "Zawieszka Sol" },
      ],
      messages: polishCopy,
      paymentMethod: "Karta",
    })

    expect(details.fulfillmentTime).toBe(`3 tygodnie\n${polishCopy.fulfillmentTime.note}`)
  })

  it("assumes courier timings when the delivery method was not loaded", () => {
    const details = detailsFor({ ...context, deliveryMethod: null })

    expect(details.estimatedDelivery).toBe(englishCopy.estimatedDelivery.courier)
    expect(details.fulfillmentTime).toBe(`${englishCopy.fulfillmentTime.fallback}\n${englishCopy.fulfillmentTime.note}`)
  })

  it("renders the Polish copy for a Polish order", () => {
    expect(detailsFor(undefined, polishCopy, "Karta").billingAddress).toBe(polishCopy.unavailable)
  })
})

describe("buildOrderConfirmationItems", () => {
  const origin = "http://127.0.0.1:3000"
  const lines = [
    { handle: "srebrny-pierscionek", imageUrl: "products/ring.jpg", price: 12_000, qty: 2, title: "Silver ring", variantId: "v1" },
  ]

  it("carries the line copy and quantities through", () => {
    expect(buildOrderConfirmationItems(lines, "pl-PL", origin)[0]).toMatchObject({ price: 12_000, qty: 2, title: "Silver ring" })
  })

  it("resolves the line image against the asset host", () => {
    expect(buildOrderConfirmationItems(lines, "pl-PL", origin)[0]?.imageUrl).toBe("https://assets.test/products/ring.jpg")
  })

  it.each([[undefined], [""]])("falls back to the placeholder for the image %j", (imageUrl) => {
    expect(
      buildOrderConfirmationItems([{ ...lines[0], imageUrl, price: 1, qty: 1, title: "t", variantId: "v" }], "pl-PL", origin)[0]?.imageUrl,
    ).toBe("https://assets.test/placeholder.svg")
  })

  it("links to the product page in the shopper's locale on the address the order came from", () => {
    expect(buildOrderConfirmationItems(lines, "pl-PL", origin)[0]?.productUrl).toBe("http://127.0.0.1:3000/products/srebrny-pierscionek")
    expect(buildOrderConfirmationItems(lines, "en-US", "https://preview.martebizuteria.pl")[0]?.productUrl).toBe(
      "https://preview.martebizuteria.pl/en-US/products/srebrny-pierscionek",
    )
  })

  it.each([[undefined], [""]])("falls back to the catalog page when the handle is %j", (handle) => {
    expect(
      buildOrderConfirmationItems([{ ...lines[0], handle, price: 1, qty: 1, title: "t", variantId: "v" }], "pl-PL", origin)[0]?.productUrl,
    ).toBe("http://127.0.0.1:3000/products")
  })

  it("produces nothing for an order with no lines", () => {
    expect(buildOrderConfirmationItems([], "pl-PL", origin)).toStrictEqual([])
  })
})

describe("buildOrderAccountCta", () => {
  const origin = "http://localhost:3000"

  it("invites a guest to create an account on the address the order came from", () => {
    expect(buildOrderAccountCta({ isGuest: true, locale: "en-US", messages: englishCopy, orderId: "order-1", origin })).toStrictEqual({
      href: "http://localhost:3000/en-US/auth/sign-up",
      isGuest: true,
      label: englishCopy.createAccountCta,
    })
  })

  it("links a signed-in shopper straight to the order", () => {
    expect(buildOrderAccountCta({ isGuest: false, locale: "en-US", messages: englishCopy, orderId: "order-1", origin })).toStrictEqual({
      href: "http://localhost:3000/en-US/account/orders/order-1",
      isGuest: false,
      label: englishCopy.viewOrderCta,
    })
  })

  it("leaves the default locale unprefixed on the production address", () => {
    expect(
      buildOrderAccountCta({
        isGuest: false,
        locale: "pl-PL",
        messages: polishCopy,
        orderId: "order-1",
        origin: "https://martebizuteria.pl",
      }).href,
    ).toBe("https://martebizuteria.pl/account/orders/order-1")
  })
})

describe("buildOrderLegalLinks", () => {
  it("links the terms, the returns page and the privacy policy on the address the order came from", () => {
    expect(buildOrderLegalLinks("https://preview.martebizuteria.pl", "en-US")).toStrictEqual({
      exchangesAndReturns: "https://preview.martebizuteria.pl/en-US/exchanges-and-returns",
      privacyPolicy: "https://preview.martebizuteria.pl/en-US/privacy-policy",
      termsOfService: "https://preview.martebizuteria.pl/en-US/terms-of-service",
    })
  })

  it("leaves the Polish pages unprefixed", () => {
    expect(buildOrderLegalLinks("http://127.0.0.1:3000", "pl-PL")).toStrictEqual({
      exchangesAndReturns: "http://127.0.0.1:3000/exchanges-and-returns",
      privacyPolicy: "http://127.0.0.1:3000/privacy-policy",
      termsOfService: "http://127.0.0.1:3000/terms-of-service",
    })
  })
})
