import { describe, expect, it, vi } from "vite-plus/test"

const { env } = vi.hoisted(() => ({ env: {} }))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { paymentIntents: { retrieve: vi.fn() } } }))
vi.mock("~/src/lib/image", () => ({ PLACEHOLDER_IMAGE: "https://assets.test/placeholder.svg" }))
vi.mock("~/src/lib/url", () => ({
  getBaseURL: () => "https://fallback.test",
  resolveAssetURL: (src: string) => `https://assets.test/${src}`,
}))

import { type CheckoutEmailContext } from "~/src/integrations/resend/order-confirmation.utils"
import { buildOrderShippedAccountCta, buildOrderShippedDetails } from "~/src/integrations/resend/order-shipped.utils"

import { APP_URL } from "~/src/presentation/branding/app"

import englishCopy from "~/messages/en-US/emails.order-shipped.json"
import polishCopy from "~/messages/pl-PL/emails.order-shipped.json"

const addressRow = {
  address1: "Krucza 1",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: null,
  postalCode: "00-001",
}

const context: CheckoutEmailContext = {
  billingAddress: null,
  billingAddressId: null,
  customerNote: null,
  deliveryMethod: { name: "Kurier", type: "courier" },
  lockerId: null,
  shippingAddress: addressRow,
  shippingAddressId: "address-1",
}

describe("buildOrderShippedDetails", () => {
  it("renders the delivery method and shipping address from the checkout", () => {
    const details = buildOrderShippedDetails(context, englishCopy)

    expect(details.deliveryMethod).toBe("Kurier")
    expect(details.shippingAddress).toBe("Anna Kowalska\nKrucza 1\n00-001 Warszawa\nPL")
  })

  it("appends the locker code to a locker shipment", () => {
    const locker: CheckoutEmailContext = { ...context, deliveryMethod: { name: "Paczkomat", type: "locker" }, lockerId: "WAW01A" }

    expect(buildOrderShippedDetails(locker, englishCopy).deliveryMethod).toBe("Paczkomat · WAW01A")
  })

  it.each([["courier"], ["locker"], ["in_store"]] as const)("uses the %s estimated delivery", (type) => {
    const details = buildOrderShippedDetails({ ...context, deliveryMethod: { name: "Method", type } }, englishCopy)

    expect(details.estimatedDelivery).toBe(englishCopy.deliveryTiming[type].estimatedDelivery)
  })

  it("assumes courier timings when no delivery method was captured", () => {
    expect(buildOrderShippedDetails({ ...context, deliveryMethod: null }, englishCopy).estimatedDelivery).toBe(
      englishCopy.deliveryTiming.courier.estimatedDelivery,
    )
  })

  it("falls back to the unavailable copy without a checkout context", () => {
    const details = buildOrderShippedDetails(undefined, englishCopy)

    expect(details.deliveryMethod).toBe(englishCopy.unavailable)
    expect(details.shippingAddress).toBe(englishCopy.unavailable)
    expect(details.estimatedDelivery).toBe(englishCopy.deliveryTiming.courier.estimatedDelivery)
  })

  it("falls back to the unavailable copy when the shipping address row was not loaded", () => {
    expect(buildOrderShippedDetails({ ...context, shippingAddress: null }, englishCopy).shippingAddress).toBe(englishCopy.unavailable)
  })

  it("renders the Polish copy for a Polish shipment", () => {
    expect(buildOrderShippedDetails(undefined, polishCopy).deliveryMethod).toBe(polishCopy.unavailable)
  })
})

describe("buildOrderShippedAccountCta", () => {
  it("links a signed-in shopper straight to the order", () => {
    expect(buildOrderShippedAccountCta({ locale: "en-US", messages: englishCopy, orderId: "order-1", userId: "user-1" })).toStrictEqual({
      href: `${APP_URL}/en-US/account/orders/order-1`,
      isGuest: false,
      label: englishCopy.viewOrderCta,
    })
  })

  it.each([[null], [undefined], [""]])("treats the shopper as a guest when the user id is %j", (userId) => {
    expect(buildOrderShippedAccountCta({ locale: "en-US", messages: englishCopy, orderId: "order-1", userId })).toStrictEqual({
      href: `${APP_URL}/en-US/auth/sign-up`,
      isGuest: true,
      label: englishCopy.createAccountCta,
    })
  })

  it("leaves the default locale unprefixed", () => {
    expect(buildOrderShippedAccountCta({ locale: "pl-PL", messages: polishCopy, orderId: "order-9", userId: "user-1" }).href).toBe(
      `${APP_URL}/account/orders/order-9`,
    )
  })
})
