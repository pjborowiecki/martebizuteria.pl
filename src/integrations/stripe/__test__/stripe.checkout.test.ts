import { type StripeCheckoutConfirmResult, type StripeCheckoutContact, type StripeCheckoutRedirectBehavior } from "@stripe/stripe-js"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { confirm, createCheckoutSessionFn, updateCheckoutSessionFn } = vi.hoisted(() => ({
  confirm:
    vi.fn<
      (args?: { billingAddress?: StripeCheckoutContact; redirect?: StripeCheckoutRedirectBehavior }) => Promise<StripeCheckoutConfirmResult>
    >(),
  createCheckoutSessionFn: vi.fn<() => Promise<{ clientSecret: string; sessionId: string }>>(),
  updateCheckoutSessionFn: vi.fn<() => Promise<{ clientSecret: string; sessionId: string }>>(),
}))

vi.mock("~/src/integrations/stripe/stripe.actions", () => ({ createCheckoutSessionFn, updateCheckoutSessionFn }))
vi.mock("@stripe/react-stripe-js/checkout", () => ({ useCheckoutElements: () => ({ checkout: { confirm }, type: "success" }) }))

import { useCheckoutElements as loadStubbedCheckout } from "@stripe/react-stripe-js/checkout"

import {
  type CheckoutSession,
  buildCheckoutContact,
  buildCheckoutLinesFingerprint,
  buildCheckoutValuesFingerprint,
  confirmCheckoutSession,
  ensureCheckoutSession,
  resetCheckoutSession,
} from "~/src/integrations/stripe/stripe.checkout"

import { type CartItem } from "~/src/modules/cart/cart.store"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

const shippingValues: CheckoutFormSchema = {
  address1: "ul. Mokotowska 12/4",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "dpd-courier",
  email: "anna@example.com",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48600123456",
  postalCode: "00-640",
}

const cartItem = (variantId: string, qty: number): CartItem => ({
  id: `line-${variantId}`,
  image: "",
  price: "249,00 zł",
  qty,
  rawPrice: 24_900,
  slug: "bransoletka-aurora",
  title: "Bransoletka Aurora",
  variantId,
  variantTitle: "Rozmiar M",
})

const items = [cartItem("variant-b", 1), cartItem("variant-a", 2)]

const existingSession: CheckoutSession = {
  amount: 74_700,
  clientSecret: "cs_secret_existing",
  linesFingerprint: buildCheckoutLinesFingerprint(items),
  sessionId: "cs_existing",
  valuesFingerprint: buildCheckoutValuesFingerprint(shippingValues),
}

describe("buildCheckoutValuesFingerprint", () => {
  it("ignores the insertion order of the form fields", () => {
    const { deliveryMethod, email, ...addressValues } = shippingValues
    const reorderedValues = { deliveryMethod, email, ...addressValues }

    expect(buildCheckoutValuesFingerprint(reorderedValues)).toBe(buildCheckoutValuesFingerprint(shippingValues))
  })

  it("treats an omitted optional field and an undefined optional field consistently", () => {
    expect(buildCheckoutValuesFingerprint({ ...shippingValues, deliveryNotes: undefined })).toBe(
      buildCheckoutValuesFingerprint(shippingValues),
    )
  })
})

describe("buildCheckoutLinesFingerprint", () => {
  it("is independent of the order the cart holds the lines in", () => {
    expect(buildCheckoutLinesFingerprint(items)).toBe(buildCheckoutLinesFingerprint([...items].toReversed()))
  })

  it("pairs each variant with its quantity in sorted order", () => {
    expect(buildCheckoutLinesFingerprint(items)).toBe("variant-a:2|variant-b:1")
  })

  it("changes when a quantity changes", () => {
    expect(buildCheckoutLinesFingerprint([cartItem("variant-a", 2)])).not.toBe(buildCheckoutLinesFingerprint([cartItem("variant-a", 3)]))
  })

  it("is empty for an empty cart", () => {
    expect(buildCheckoutLinesFingerprint([])).toBe("")
  })

  it("keeps duplicate lines for the same variant distinguishable from one merged line", () => {
    expect(buildCheckoutLinesFingerprint([cartItem("variant-a", 1), cartItem("variant-a", 1)])).toBe("variant-a:1|variant-a:1")
  })
})

describe("buildCheckoutContact", () => {
  it("uses the shipping address when billing matches it", () => {
    expect(buildCheckoutContact({ ...shippingValues, sameAsShipping: true })).toStrictEqual({
      address: { city: "Warszawa", country: "PL", line1: "ul. Mokotowska 12/4", postal_code: "00-640" },
      name: "Anna Kowalska",
    })
  })

  it("treats an unset sameAsShipping as shipping, not billing", () => {
    expect(buildCheckoutContact(shippingValues).address.line1).toBe("ul. Mokotowska 12/4")
  })

  it("uses the separate billing address when the shopper supplies one", () => {
    const contact = buildCheckoutContact({
      ...shippingValues,
      billingAddress1: "ul. Krucza 1",
      billingCity: "Kraków",
      billingCountryCode: "PL",
      billingFirstName: "Jan",
      billingLastName: "Nowak",
      billingPostalCode: "30-001",
      sameAsShipping: false,
    })

    expect(contact).toStrictEqual({
      address: { city: "Kraków", country: "PL", line1: "ul. Krucza 1", postal_code: "30-001" },
      name: "Jan Nowak",
    })
  })

  it("sends empty strings rather than undefined for billing fields left blank", () => {
    const contact = buildCheckoutContact({ ...shippingValues, sameAsShipping: false })

    expect(contact).toStrictEqual({
      address: { city: "", country: "", line1: "", postal_code: "" },
      name: "",
    })
  })

  it("trims the gap left by a missing billing surname", () => {
    const contact = buildCheckoutContact({ ...shippingValues, billingFirstName: "Jan", sameAsShipping: false })

    expect(contact.name).toBe("Jan")
  })
})

describe("ensureCheckoutSession", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("creates a session when there is none yet", async () => {
    createCheckoutSessionFn.mockResolvedValue({ clientSecret: "cs_secret_new", sessionId: "cs_new" })

    await expect(ensureCheckoutSession({ amount: 74_700, existing: undefined, items, values: shippingValues })).resolves.toStrictEqual({
      amount: 74_700,
      clientSecret: "cs_secret_new",
      linesFingerprint: "variant-a:2|variant-b:1",
      sessionId: "cs_new",
      valuesFingerprint: buildCheckoutValuesFingerprint(shippingValues),
    })
    expect(createCheckoutSessionFn).toHaveBeenCalledWith({ data: { checkoutValues: shippingValues, items } })
    expect(updateCheckoutSessionFn).not.toHaveBeenCalled()
  })

  it("reuses an unchanged session without calling Stripe again", async () => {
    await expect(
      ensureCheckoutSession({ amount: existingSession.amount, existing: existingSession, items, values: shippingValues }),
    ).resolves.toBe(existingSession)
    expect(createCheckoutSessionFn).not.toHaveBeenCalled()
    expect(updateCheckoutSessionFn).not.toHaveBeenCalled()
  })

  it("updates the session when the amount changed", async () => {
    updateCheckoutSessionFn.mockResolvedValue({ clientSecret: "cs_secret_updated", sessionId: "cs_existing" })

    await expect(
      ensureCheckoutSession({ amount: 99_600, existing: existingSession, items, values: shippingValues }),
    ).resolves.toStrictEqual({
      amount: 99_600,
      clientSecret: "cs_secret_updated",
      linesFingerprint: "variant-a:2|variant-b:1",
      sessionId: "cs_existing",
      valuesFingerprint: buildCheckoutValuesFingerprint(shippingValues),
    })
    expect(updateCheckoutSessionFn).toHaveBeenCalledWith({
      data: { checkoutValues: shippingValues, items, sessionId: "cs_existing" },
    })
  })

  it("updates the session when the lines changed even at the same amount", async () => {
    updateCheckoutSessionFn.mockResolvedValue({ clientSecret: "cs_secret_updated", sessionId: "cs_existing" })
    const swapped = [cartItem("variant-c", 3)]

    const session = await ensureCheckoutSession({
      amount: existingSession.amount,
      existing: existingSession,
      items: swapped,
      values: shippingValues,
    })

    expect(session.linesFingerprint).toBe("variant-c:3")
    expect(updateCheckoutSessionFn).toHaveBeenCalledTimes(1)
  })

  it.each<Partial<CheckoutFormSchema>>([
    { email: "new-email@example.com" },
    { address1: "ul. Nowa 42" },
    { deliveryMethod: "same-price-courier" },
    { deliveryMethodType: "locker", lockerId: "WAW42M" },
    { deliveryNotes: "Please ring the bell" },
    { billingAddress1: "ul. Firmowa 1", sameAsShipping: false },
  ])("persists checkout changes without requiring the amount or cart to change: %j", async (changes) => {
    updateCheckoutSessionFn.mockResolvedValue({ clientSecret: "cs_secret_updated", sessionId: "cs_existing" })
    const values = { ...shippingValues, ...changes }

    const updated = await ensureCheckoutSession({ amount: existingSession.amount, existing: existingSession, items, values })

    expect(updateCheckoutSessionFn).toHaveBeenCalledExactlyOnceWith({
      data: { checkoutValues: values, items, sessionId: "cs_existing" },
    })
    expect(createCheckoutSessionFn).not.toHaveBeenCalled()
    expect(updated.valuesFingerprint).toBe(buildCheckoutValuesFingerprint(values))

    await expect(ensureCheckoutSession({ amount: updated.amount, existing: updated, items, values })).resolves.toBe(updated)
    expect(updateCheckoutSessionFn).toHaveBeenCalledTimes(1)
  })

  it("adopts the session id Stripe returns when it replaces the old one", async () => {
    updateCheckoutSessionFn.mockResolvedValue({ clientSecret: "cs_secret_replacement", sessionId: "cs_replacement" })

    const session = await ensureCheckoutSession({ amount: 1, existing: existingSession, items, values: shippingValues })

    expect(session.sessionId).toBe("cs_replacement")
  })
})

describe("resetCheckoutSession", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("always updates the session, even when nothing changed", async () => {
    updateCheckoutSessionFn.mockResolvedValue({ clientSecret: "cs_secret_reset", sessionId: "cs_existing" })

    await expect(
      resetCheckoutSession({ amount: existingSession.amount, items, session: existingSession, values: shippingValues }),
    ).resolves.toStrictEqual({
      amount: existingSession.amount,
      clientSecret: "cs_secret_reset",
      linesFingerprint: "variant-a:2|variant-b:1",
      sessionId: "cs_existing",
      valuesFingerprint: buildCheckoutValuesFingerprint(shippingValues),
    })
    expect(updateCheckoutSessionFn).toHaveBeenCalledTimes(1)
  })

  it("recomputes the fingerprint from the cart it is given", async () => {
    updateCheckoutSessionFn.mockResolvedValue({ clientSecret: "cs_secret_reset", sessionId: "cs_existing" })

    const session = await resetCheckoutSession({ amount: 1, items: [], session: existingSession, values: shippingValues })

    expect(session.linesFingerprint).toBe("")
  })
})

const stubbedCheckout = () => {
  const elements = loadStubbedCheckout()
  if (elements.type !== "success") {
    throw new Error("the stubbed Stripe SDK loaded no checkout")
  }

  return elements.checkout
}

describe("confirmCheckoutSession", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("confirms with the billing contact and stays on the page for a card that needs no redirect", async () => {
    const checkout = stubbedCheckout()
    confirm.mockResolvedValue({ session: checkout, type: "success" })

    await expect(confirmCheckoutSession({ checkout, values: { ...shippingValues, sameAsShipping: true } })).resolves.toStrictEqual({
      status: "success",
    })
    expect(confirm).toHaveBeenCalledWith({
      billingAddress: {
        address: { city: "Warszawa", country: "PL", line1: "ul. Mokotowska 12/4", postal_code: "00-640" },
        name: "Anna Kowalska",
      },
      redirect: "if_required",
    })
  })

  it("sends the separate billing address when the shopper supplied one", async () => {
    const checkout = stubbedCheckout()
    confirm.mockResolvedValue({ session: checkout, type: "success" })

    await confirmCheckoutSession({
      checkout,
      values: {
        ...shippingValues,
        billingAddress1: "ul. Krucza 1",
        billingCity: "Kraków",
        billingCountryCode: "PL",
        billingFirstName: "Jan",
        billingLastName: "Nowak",
        billingPostalCode: "30-001",
        sameAsShipping: false,
      },
    })

    expect(confirm).toHaveBeenCalledWith({
      billingAddress: {
        address: { city: "Kraków", country: "PL", line1: "ul. Krucza 1", postal_code: "30-001" },
        name: "Jan Nowak",
      },
      redirect: "if_required",
    })
  })

  it("reports a declined payment as final, so the shopper is asked for another card", async () => {
    confirm.mockResolvedValue({
      error: { code: "paymentFailed", message: "Your card was declined.", paymentFailed: { declineCode: "generic_decline" } },
      type: "error",
    })

    await expect(confirmCheckoutSession({ checkout: stubbedCheckout(), values: shippingValues })).resolves.toStrictEqual({
      message: "Your card was declined.",
      recoverable: false,
      status: "error",
    })
  })

  it("reports any other confirmation failure as recoverable, so the session can be retried", async () => {
    confirm.mockResolvedValue({ error: { code: null, message: "This checkout session has expired." }, type: "error" })

    await expect(confirmCheckoutSession({ checkout: stubbedCheckout(), values: shippingValues })).resolves.toStrictEqual({
      message: "This checkout session has expired.",
      recoverable: true,
      status: "error",
    })
  })
})
