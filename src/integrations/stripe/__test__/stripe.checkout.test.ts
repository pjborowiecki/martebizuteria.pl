import {
  type StripeCheckoutConfirmResult,
  type StripeCheckoutContact,
  type StripeCheckoutRedirectBehavior,
  type StripeCheckoutStatus,
} from "@stripe/stripe-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type OrderTotals } from "~/src/modules/order/order.totals"

interface OpenedSession {
  amount: number
  clientSecret: string
  lines: { qty: number; unitPrice: number; variantId: string }[]
  sessionId: string
  totals: OrderTotals
}

const { confirm, createCheckoutSessionFn, updateCheckoutSessionFn } = vi.hoisted(() => ({
  confirm:
    vi.fn<
      (args?: { billingAddress?: StripeCheckoutContact; redirect?: StripeCheckoutRedirectBehavior }) => Promise<StripeCheckoutConfirmResult>
    >(),
  createCheckoutSessionFn: vi.fn<() => Promise<OpenedSession>>(),
  updateCheckoutSessionFn: vi.fn<() => Promise<OpenedSession>>(),
}))

vi.mock("~/src/integrations/stripe/stripe.actions", () => ({ createCheckoutSessionFn, updateCheckoutSessionFn }))
vi.mock("@stripe/react-stripe-js/checkout", () => ({ useCheckoutElements: () => ({ checkout: { confirm }, type: "success" }) }))

import { useCheckoutElements as loadStubbedCheckout } from "@stripe/react-stripe-js/checkout"

import {
  type CheckoutSession,
  PaidCheckoutSessionError,
  buildCheckoutContact,
  buildCheckoutLinesFingerprint,
  buildCheckoutValuesFingerprint,
  confirmCheckoutSession,
  ensureCheckoutSession,
  isCheckoutSessionFor,
  resetCheckoutSession,
} from "~/src/integrations/stripe/stripe.checkout"
import { ProcessingCheckoutSessionError } from "~/src/integrations/stripe/stripe.checkout.processing"
import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

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

const cartItem = (variantId: string, qty: number, rawPrice = 24_900): CartItem => ({
  id: `line-${variantId}`,
  image: "",
  price: "249,00 zł",
  qty,
  rawPrice,
  slug: "bransoletka-aurora",
  title: "Bransoletka Aurora",
  variantId,
  variantTitle: "Rozmiar M",
})

const items = [cartItem("variant-b", 1), cartItem("variant-a", 2)]

const QUOTED_LINES = [
  { qty: 1, unitPrice: 24_900, variantId: "variant-b" },
  { qty: 2, unitPrice: 24_900, variantId: "variant-a" },
]

const QUOTED_TOTALS: OrderTotals = {
  discountTotal: 0,
  shippingTotal: 1500,
  subtotal: 74_700,
  taxTotal: 14_249,
  total: 76_200,
  vatBasisPoints: 2300,
}

const opened = (sessionId: string, clientSecret: string, lines = QUOTED_LINES): OpenedSession => ({
  amount: QUOTED_TOTALS.total,
  clientSecret,
  lines,
  sessionId,
  totals: QUOTED_TOTALS,
})

const existingSession: CheckoutSession = {
  clientSecret: "cs_secret_existing",
  expiresAt: Date.UTC(2026, 9, 5, 12, 32),
  lines: QUOTED_LINES,
  sessionId: "cs_existing",
  totals: QUOTED_TOTALS,
  valuesFingerprint: buildCheckoutValuesFingerprint(shippingValues),
}

const repricedItems = [cartItem("variant-b", 1, 26_900), cartItem("variant-a", 2)]

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
  it("is independent of the order the lines come in", () => {
    expect(buildCheckoutLinesFingerprint(QUOTED_LINES)).toBe(buildCheckoutLinesFingerprint(QUOTED_LINES.toReversed()))
  })

  it("pairs each variant with its quantity and unit price in sorted order", () => {
    expect(buildCheckoutLinesFingerprint(QUOTED_LINES)).toBe("variant-a:2:24900|variant-b:1:24900")
  })

  it("changes when a quantity changes", () => {
    expect(buildCheckoutLinesFingerprint([{ qty: 2, unitPrice: 100, variantId: "variant-a" }])).not.toBe(
      buildCheckoutLinesFingerprint([{ qty: 3, unitPrice: 100, variantId: "variant-a" }]),
    )
  })

  it("changes when a unit price changes", () => {
    expect(buildCheckoutLinesFingerprint([{ qty: 2, unitPrice: 100, variantId: "variant-a" }])).not.toBe(
      buildCheckoutLinesFingerprint([{ qty: 2, unitPrice: 110, variantId: "variant-a" }]),
    )
  })

  it("is empty for an empty cart", () => {
    expect(buildCheckoutLinesFingerprint([])).toBe("")
  })

  it("keeps duplicate lines for the same variant distinguishable from one merged line", () => {
    const line = { qty: 1, unitPrice: 100, variantId: "variant-a" }

    expect(buildCheckoutLinesFingerprint([line, line])).toBe("variant-a:1:100|variant-a:1:100")
  })
})

describe("isCheckoutSessionFor", () => {
  it("accepts a session quoted for the cart and the details on screen", () => {
    expect(isCheckoutSessionFor(existingSession, { items, values: shippingValues })).toBe(true)
  })

  it("rejects a session quoted at another price than the cart now shows", () => {
    expect(isCheckoutSessionFor(existingSession, { items: repricedItems, values: shippingValues })).toBe(false)
  })

  it("rejects a session opened for other quantities", () => {
    expect(isCheckoutSessionFor(existingSession, { items: [cartItem("variant-a", 2)], values: shippingValues })).toBe(false)
  })

  it("rejects a session opened for other checkout details", () => {
    expect(isCheckoutSessionFor(existingSession, { items, values: { ...shippingValues, deliveryMethod: "inpost" } })).toBe(false)
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

const OPENED_AT = Date.UTC(2026, 9, 5, 12)

const EXPIRES_AT = OPENED_AT + 1_920_000

const useOpeningTime = (): void => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(OPENED_AT)
}

describe("ensureCheckoutSession", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useOpeningTime()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("creates a session when the browser holds none yet and keeps the lines and totals the server quoted", async () => {
    createCheckoutSessionFn.mockResolvedValue(opened("cs_new", "cs_secret_new"))

    await expect(
      ensureCheckoutSession({ existing: undefined, heldSessionId: undefined, items, values: shippingValues }),
    ).resolves.toStrictEqual({
      clientSecret: "cs_secret_new",
      expiresAt: EXPIRES_AT,
      lines: QUOTED_LINES,
      sessionId: "cs_new",
      totals: QUOTED_TOTALS,
      valuesFingerprint: buildCheckoutValuesFingerprint(shippingValues),
    })
    expect(createCheckoutSessionFn).toHaveBeenCalledWith({ data: { checkoutValues: shippingValues, items } })
    expect(updateCheckoutSessionFn).not.toHaveBeenCalled()
  })

  it("keeps the price the server quoted even when the cart remembered another one", async () => {
    createCheckoutSessionFn.mockResolvedValue(opened("cs_new", "cs_secret_new"))

    const session = await ensureCheckoutSession({
      existing: undefined,
      heldSessionId: undefined,
      items: repricedItems,
      values: shippingValues,
    })

    expect(session.lines).toStrictEqual(QUOTED_LINES)
    expect(isCheckoutSessionFor(session, { items: repricedItems, values: shippingValues })).toBe(false)
  })
})

describe("ensureCheckoutSession with a session the browser holds", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useOpeningTime()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("continues the session the browser holds instead of opening a second one after a reload", async () => {
    updateCheckoutSessionFn.mockResolvedValue(opened("cs_replacement", "cs_secret_replacement"))

    const session = await ensureCheckoutSession({ existing: undefined, heldSessionId: "cs_held", items, values: shippingValues })

    expect(updateCheckoutSessionFn).toHaveBeenCalledExactlyOnceWith({
      data: { checkoutValues: shippingValues, items, sessionId: "cs_held" },
    })
    expect(createCheckoutSessionFn).not.toHaveBeenCalled()
    expect(session).toMatchObject({ clientSecret: "cs_secret_replacement", expiresAt: EXPIRES_AT, sessionId: "cs_replacement" })
  })

  it("continues the session another tab moved the browser to rather than the one this tab still shows", async () => {
    updateCheckoutSessionFn.mockResolvedValue(opened("cs_replacement", "cs_secret_replacement"))

    await ensureCheckoutSession({ existing: existingSession, heldSessionId: "cs_other_tab", items, values: shippingValues })

    expect(updateCheckoutSessionFn).toHaveBeenCalledExactlyOnceWith({
      data: { checkoutValues: shippingValues, items, sessionId: "cs_other_tab" },
    })
  })

  it("starts a fresh checkout when the session the browser held has closed", async () => {
    updateCheckoutSessionFn.mockRejectedValue(new Error(CHECKOUT_ERROR_CODES.SESSION_CLOSED))
    createCheckoutSessionFn.mockResolvedValue(opened("cs_fresh", "cs_secret_fresh"))

    const session = await ensureCheckoutSession({ existing: undefined, heldSessionId: "cs_expired", items, values: shippingValues })

    expect(session.sessionId).toBe("cs_fresh")
    expect(createCheckoutSessionFn).toHaveBeenCalledExactlyOnceWith({ data: { checkoutValues: shippingValues, items } })
  })

  it("names the held session the server reports paid instead of opening a second payment for it", async () => {
    updateCheckoutSessionFn.mockRejectedValue(new Error(CHECKOUT_ERROR_CODES.SESSION_COMPLETE))

    const continuing = ensureCheckoutSession({ existing: undefined, heldSessionId: "cs_paid", items, values: shippingValues })

    await expect(continuing).rejects.toBeInstanceOf(PaidCheckoutSessionError)
    await expect(continuing).rejects.toMatchObject({ message: CHECKOUT_ERROR_CODES.SESSION_COMPLETE, sessionId: "cs_paid" })
    expect(createCheckoutSessionFn).not.toHaveBeenCalled()
  })

  it("names the held session whose payment the bank is still confirming instead of opening a second payment for it", async () => {
    updateCheckoutSessionFn.mockRejectedValue(new Error(CHECKOUT_ERROR_CODES.SESSION_PROCESSING))

    const continuing = ensureCheckoutSession({ existing: undefined, heldSessionId: "cs_awaiting_bank", items, values: shippingValues })

    await expect(continuing).rejects.toBeInstanceOf(ProcessingCheckoutSessionError)
    await expect(continuing).rejects.toMatchObject({
      message: CHECKOUT_ERROR_CODES.SESSION_PROCESSING,
      name: "ProcessingCheckoutSessionError",
      sessionId: "cs_awaiting_bank",
    })
    expect(createCheckoutSessionFn).not.toHaveBeenCalled()
  })
})

describe("ensureCheckoutSession with the session on screen", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useOpeningTime()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("reuses an unchanged session without calling Stripe again", async () => {
    await expect(
      ensureCheckoutSession({ existing: existingSession, heldSessionId: existingSession.sessionId, items, values: shippingValues }),
    ).resolves.toBe(existingSession)
    expect(createCheckoutSessionFn).not.toHaveBeenCalled()
    expect(updateCheckoutSessionFn).not.toHaveBeenCalled()
  })

  it("reuses an unchanged session when the browser could not store its id", async () => {
    await expect(
      ensureCheckoutSession({ existing: existingSession, heldSessionId: undefined, items, values: shippingValues }),
    ).resolves.toBe(existingSession)
    expect(updateCheckoutSessionFn).not.toHaveBeenCalled()
  })

  it("updates the session when the shop changed a price since it was quoted", async () => {
    const requoted = [
      { qty: 1, unitPrice: 26_900, variantId: "variant-b" },
      { qty: 2, unitPrice: 24_900, variantId: "variant-a" },
    ]
    updateCheckoutSessionFn.mockResolvedValue(opened("cs_existing", "cs_secret_updated", requoted))

    const session = await ensureCheckoutSession({
      existing: existingSession,
      heldSessionId: undefined,
      items: repricedItems,
      values: shippingValues,
    })

    expect(updateCheckoutSessionFn).toHaveBeenCalledExactlyOnceWith({
      data: { checkoutValues: shippingValues, items: repricedItems, sessionId: "cs_existing" },
    })
    expect(session.lines).toStrictEqual(requoted)
    expect(isCheckoutSessionFor(session, { items: repricedItems, values: shippingValues })).toBe(true)
  })

  it("updates the session when the lines changed", async () => {
    const swappedLines = [{ qty: 3, unitPrice: 24_900, variantId: "variant-c" }]
    updateCheckoutSessionFn.mockResolvedValue(opened("cs_existing", "cs_secret_updated", swappedLines))
    const swapped = [cartItem("variant-c", 3)]

    const session = await ensureCheckoutSession({
      existing: existingSession,
      heldSessionId: existingSession.sessionId,
      items: swapped,
      values: shippingValues,
    })

    expect(session.lines).toStrictEqual(swappedLines)
    expect(updateCheckoutSessionFn).toHaveBeenCalledTimes(1)
  })

  it.each<Partial<CheckoutFormSchema>>([
    { email: "new-email@example.com" },
    { address1: "ul. Nowa 42" },
    { deliveryMethod: "same-price-courier" },
    { deliveryMethodType: "locker", lockerId: "WAW42M" },
    { deliveryNotes: "Please ring the bell" },
    { billingAddress1: "ul. Firmowa 1", sameAsShipping: false },
  ])("persists checkout changes without requiring the cart to change: %j", async (changes) => {
    updateCheckoutSessionFn.mockResolvedValue(opened("cs_existing", "cs_secret_updated"))
    const values = { ...shippingValues, ...changes }

    const updated = await ensureCheckoutSession({ existing: existingSession, heldSessionId: undefined, items, values })

    expect(updateCheckoutSessionFn).toHaveBeenCalledExactlyOnceWith({
      data: { checkoutValues: values, items, sessionId: "cs_existing" },
    })
    expect(createCheckoutSessionFn).not.toHaveBeenCalled()
    expect(updated.valuesFingerprint).toBe(buildCheckoutValuesFingerprint(values))

    await expect(ensureCheckoutSession({ existing: updated, heldSessionId: undefined, items, values })).resolves.toBe(updated)
    expect(updateCheckoutSessionFn).toHaveBeenCalledTimes(1)
  })

  it("adopts the session id Stripe returns when it replaces the old one", async () => {
    updateCheckoutSessionFn.mockResolvedValue(opened("cs_replacement", "cs_secret_replacement"))

    const session = await ensureCheckoutSession({
      existing: existingSession,
      heldSessionId: undefined,
      items: repricedItems,
      values: shippingValues,
    })

    expect(session.sessionId).toBe("cs_replacement")
  })

  it("starts a fresh checkout when the server refuses to change a session that has closed", async () => {
    updateCheckoutSessionFn.mockRejectedValue(new Error(CHECKOUT_ERROR_CODES.SESSION_CLOSED))
    createCheckoutSessionFn.mockResolvedValue(opened("cs_fresh", "cs_secret_fresh"))

    await expect(
      ensureCheckoutSession({ existing: existingSession, heldSessionId: undefined, items: repricedItems, values: shippingValues }),
    ).resolves.toStrictEqual({
      clientSecret: "cs_secret_fresh",
      expiresAt: EXPIRES_AT,
      lines: QUOTED_LINES,
      sessionId: "cs_fresh",
      totals: QUOTED_TOTALS,
      valuesFingerprint: buildCheckoutValuesFingerprint(shippingValues),
    })
    expect(createCheckoutSessionFn).toHaveBeenCalledExactlyOnceWith({ data: { checkoutValues: shippingValues, items: repricedItems } })
  })

  it.each([new Error(CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY), "SESSION_CLOSED"])(
    "reports any other update failure instead of starting over: %s",
    async (failure) => {
      updateCheckoutSessionFn.mockRejectedValue(failure)

      await expect(
        ensureCheckoutSession({ existing: existingSession, heldSessionId: undefined, items: repricedItems, values: shippingValues }),
      ).rejects.toBe(failure)
      expect(createCheckoutSessionFn).not.toHaveBeenCalled()
    },
  )
})

describe("resetCheckoutSession", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useOpeningTime()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("always updates the session, even when nothing changed", async () => {
    updateCheckoutSessionFn.mockResolvedValue(opened("cs_existing", "cs_secret_reset"))

    await expect(
      resetCheckoutSession({ heldSessionId: undefined, items, session: existingSession, values: shippingValues }),
    ).resolves.toStrictEqual({
      clientSecret: "cs_secret_reset",
      expiresAt: EXPIRES_AT,
      lines: QUOTED_LINES,
      sessionId: "cs_existing",
      totals: QUOTED_TOTALS,
      valuesFingerprint: buildCheckoutValuesFingerprint(shippingValues),
    })
    expect(updateCheckoutSessionFn).toHaveBeenCalledExactlyOnceWith({
      data: { checkoutValues: shippingValues, items, sessionId: "cs_existing" },
    })
  })

  it("resets the session the browser holds when another tab has replaced the one on screen", async () => {
    updateCheckoutSessionFn.mockResolvedValue(opened("cs_replacement", "cs_secret_reset"))

    await resetCheckoutSession({ heldSessionId: "cs_other_tab", items, session: existingSession, values: shippingValues })

    expect(updateCheckoutSessionFn).toHaveBeenCalledExactlyOnceWith({
      data: { checkoutValues: shippingValues, items, sessionId: "cs_other_tab" },
    })
  })

  it("keeps what the server quoted rather than the cart it was sent", async () => {
    updateCheckoutSessionFn.mockResolvedValue(opened("cs_existing", "cs_secret_reset"))

    const session = await resetCheckoutSession({
      heldSessionId: undefined,
      items: repricedItems,
      session: existingSession,
      values: shippingValues,
    })

    expect(session.lines).toStrictEqual(QUOTED_LINES)
    expect(session.totals).toBe(QUOTED_TOTALS)
  })

  it("starts a fresh checkout when the session it was paying has expired", async () => {
    updateCheckoutSessionFn.mockRejectedValue(new Error(CHECKOUT_ERROR_CODES.SESSION_CLOSED))
    createCheckoutSessionFn.mockResolvedValue(opened("cs_fresh", "cs_secret_fresh"))

    const session = await resetCheckoutSession({ heldSessionId: undefined, items, session: existingSession, values: shippingValues })

    expect(session).toMatchObject({ clientSecret: "cs_secret_fresh", expiresAt: EXPIRES_AT, sessionId: "cs_fresh" })
    expect(createCheckoutSessionFn).toHaveBeenCalledExactlyOnceWith({ data: { checkoutValues: shippingValues, items } })
  })

  it("names the session it was paying when the server reports it paid, instead of opening a fresh checkout", async () => {
    updateCheckoutSessionFn.mockRejectedValue(new Error(CHECKOUT_ERROR_CODES.SESSION_COMPLETE))

    await expect(
      resetCheckoutSession({ heldSessionId: undefined, items, session: existingSession, values: shippingValues }),
    ).rejects.toMatchObject({ name: "PaidCheckoutSessionError", sessionId: "cs_existing" })
    expect(createCheckoutSessionFn).not.toHaveBeenCalled()
  })

  it("names the session it was paying when the bank is still confirming that payment, instead of opening a fresh checkout", async () => {
    updateCheckoutSessionFn.mockRejectedValue(new Error(CHECKOUT_ERROR_CODES.SESSION_PROCESSING))

    await expect(
      resetCheckoutSession({ heldSessionId: undefined, items, session: existingSession, values: shippingValues }),
    ).rejects.toMatchObject({ name: "ProcessingCheckoutSessionError", sessionId: "cs_existing" })
    expect(createCheckoutSessionFn).not.toHaveBeenCalled()
  })
})

const stubbedCheckout = () => {
  const elements = loadStubbedCheckout()
  if (elements.type !== "success") {
    throw new Error("the stubbed Stripe SDK loaded no checkout")
  }

  return elements.checkout
}

const PAID: StripeCheckoutStatus = { paymentStatus: "paid", type: "complete" }

const confirmedAs = (status: StripeCheckoutStatus): StripeCheckoutConfirmResult => ({
  session: { ...stubbedCheckout(), status },
  type: "success",
})

describe("confirmCheckoutSession", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("confirms with the billing contact and stays on the page for a card that needs no redirect", async () => {
    const checkout = stubbedCheckout()
    confirm.mockResolvedValue(confirmedAs(PAID))

    await expect(confirmCheckoutSession({ checkout, values: { ...shippingValues, sameAsShipping: true } })).resolves.toStrictEqual({
      status: "success",
    })
    expect(confirm).toHaveBeenCalledWith({
      billingAddress: {
        address: { city: "Warszawa", country: "PL", line1: "ul. Mokotowska 12/4", postal_code: "00-640" },
        name: "Anna Kowalska",
      },
      phoneNumber: "+48600123456",
      redirect: "if_required",
    })
  })

  it("sends the shopper's phone number in international format, since the payment form asks for no billing details", async () => {
    const checkout = stubbedCheckout()
    confirm.mockResolvedValue(confirmedAs(PAID))

    await confirmCheckoutSession({ checkout, values: { ...shippingValues, phone: "600 123 456" } })

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: "+48600123456" }))
  })

  it("sends the separate billing address when the shopper supplied one", async () => {
    const checkout = stubbedCheckout()
    confirm.mockResolvedValue(confirmedAs(PAID))

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
      phoneNumber: "+48600123456",
      redirect: "if_required",
    })
  })

  it("reports a session that needed no payment as paid", async () => {
    confirm.mockResolvedValue(confirmedAs({ paymentStatus: "no_payment_required", type: "complete" }))

    await expect(confirmCheckoutSession({ checkout: stubbedCheckout(), values: shippingValues })).resolves.toStrictEqual({
      status: "success",
    })
  })

  it.each<{ label: string; status: StripeCheckoutStatus }>([
    {
      label: "a delayed-notification payment that completed the session but has not settled",
      status: { paymentStatus: "unpaid", type: "complete" },
    },
    { label: "a BLIK payment still waiting for approval in the banking app", status: { type: "open" } },
  ])("reports $label as still processing instead of paid", async ({ status }) => {
    confirm.mockResolvedValue(confirmedAs(status))

    await expect(confirmCheckoutSession({ checkout: stubbedCheckout(), values: shippingValues })).resolves.toStrictEqual({
      status: "processing",
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
