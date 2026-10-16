import { type ComponentProps, type ReactElement } from "react"

import { type Attachment } from "resend"
import type Stripe from "stripe"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type FulfillmentTimeAttribute } from "~/src/modules/attribute-on-product/attribute-on-product.server"

type OrderConfirmationElement = ReactElement<ComponentProps<typeof OrderConfirmation>>

const {
  embedEmailImages,
  fulfillCheckout,
  getCheckoutEmailContext,
  getFulfillmentTimeAttributesByVariantId,
  getOrderTotalsForEmail,
  loadWithdrawalFormAttachment,
  paymentIntentsRetrieve,
  recordOrderEmailOutcome,
  recordOrderPaymentCapturedAudit,
  sendEmail,
  sendNewOrderEmail,
} = vi.hoisted(() => ({
  embedEmailImages: vi.fn<(urls: readonly string[]) => Promise<{ attachments: Attachment[]; sources: ReadonlyMap<string, string> }>>(),
  fulfillCheckout: vi.fn<(input: object) => Promise<string | undefined>>(),
  getCheckoutEmailContext: vi.fn<(checkoutId: string) => Promise<object | undefined>>(),
  getFulfillmentTimeAttributesByVariantId:
    vi.fn<(variantIds: readonly string[]) => Promise<ReadonlyMap<string, FulfillmentTimeAttribute>>>(),
  getOrderTotalsForEmail: vi.fn<(orderId: string) => Promise<Record<string, unknown> | undefined>>(),
  loadWithdrawalFormAttachment: vi.fn<(origin: string) => Promise<Attachment>>(),
  paymentIntentsRetrieve: vi.fn<(id: string, params: object) => Promise<{ payment_method: { type: string } | null }>>(),
  recordOrderEmailOutcome: vi.fn(),
  recordOrderPaymentCapturedAudit: vi.fn(),
  sendEmail: vi.fn<
    (
      options: Readonly<{
        attachments?: Attachment[]
        idempotencyKey?: string
        react: OrderConfirmationElement
        subject: string
        to: string
      }>,
    ) => Promise<string | undefined>
  >(),
  sendNewOrderEmail: vi.fn<(orderId: string, returnUrl: string | undefined) => Promise<boolean>>(),
}))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { paymentIntents: { retrieve: paymentIntentsRetrieve } } }))
vi.mock("~/src/integrations/stripe/stripe.coupons.server", () => ({ deleteCheckoutCoupons: vi.fn(() => Promise.resolve(undefined)) }))
vi.mock("~/src/modules/order/use-cases/send-new-order-email.server", () => ({ sendNewOrderEmail }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/cloudflare-r2/media.email.server", () => ({ embedEmailImages }))
vi.mock("~/src/modules/order-withdrawal/order-withdrawal.form.server", () => ({ loadWithdrawalFormAttachment }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation: vi.fn(),
  scheduleProductCatalogInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordOrderDisputeClosedAudit: vi.fn(),
  recordOrderDisputeOpenedAudit: vi.fn(),
  recordOrderEmailOutcome,
  recordOrderPaymentCapturedAudit,
  recordOrderPaymentFailedAudit: vi.fn(),
  recordOrderReleasedAudit: vi.fn(),
}))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.server", () => ({ getFulfillmentTimeAttributesByVariantId }))
vi.mock("~/src/modules/checkout/checkout.accessors", () => ({ getCheckoutEmailContext }))
vi.mock("~/src/modules/checkout/use-cases/fulfill-checkout.server", () => ({ fulfillCheckout }))
vi.mock("~/src/modules/checkout/use-cases/release-checkout.server", () => ({ releaseCheckout: vi.fn() }))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderTotalsForEmail }))
vi.mock("~/src/modules/store-setting/store-setting.accessors", async () => {
  const { TEST_STORED_SELLER_DETAILS } = await import("~/src/platform/testing/mocks/seller-details")

  return { readSellerDetails: () => Promise.resolve(TEST_STORED_SELLER_DETAILS) }
})
vi.mock("~/src/modules/order/use-cases/clear-order-dispute", () => ({ clearOrderDispute: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/flag-order-dispute", () => ({ flagOrderDispute: vi.fn() }))
vi.mock("~/src/modules/order/use-cases/refund-order", () => ({ refundOrder: vi.fn() }))
vi.mock("~/src/modules/checkout/checkout.session-lines.server", async () => {
  const { parseCheckoutSessionFulfillmentLines } = await import("~/src/modules/checkout/checkout-metadata.zod")

  return {
    readCheckoutSessionLines: (session: Parameters<typeof parseCheckoutSessionFulfillmentLines>[0]) =>
      Promise.resolve(parseCheckoutSessionFulfillmentLines(session)),
  }
})

import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import { executionContextStorage } from "~/src/lib/background"

import { checkoutSession, checkoutSessionCompletedEvent } from "./fixtures/stripe-webhook-events"
import englishCopy from "~/messages/en-US/emails.order-confirmation.json"
import polishCopy from "~/messages/pl-PL/emails.order-confirmation.json"
import { OrderConfirmation } from "~/src/presentation/emails/order-confirmation"

vi.spyOn(console, "error").mockImplementation(() => {})

vi.spyOn(console, "info").mockImplementation(() => {})

const fulfillmentLines = [
  {
    handle: "bransoletka-aurora",
    imageUrl: "products/aurora.jpg",
    price: 24_900,
    qty: 2,
    title: "Bransoletka Aurora",
    variantId: "var-aurora",
  },
]

const ITEMS_TOTAL = 49_800

const SHIPPING_TOTAL = 5000

const AMOUNT_TOTAL = ITEMS_TOTAL + SHIPPING_TOTAL

const PLACED_ORDER = {
  discountTotal: 0,
  email: "anna@example.com",
  orderNumber: "MRT-2026-00042",
  shippingTotal: SHIPPING_TOTAL,
  subtotal: ITEMS_TOTAL,
  taxBasisPoints: 2300,
  taxTotal: 12_080,
  total: AMOUNT_TOTAL,
  userId: null,
}

const WITHDRAWAL_FORM: Attachment = { content: "JVBERi0=", contentType: "application/pdf", filename: "formularz_zwrotu.pdf" }

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const paidSession = (metadata: Stripe.Metadata, email: string | null = "anna@example.com"): Stripe.Checkout.Session =>
  checkoutSession({ amountTotal: AMOUNT_TOTAL, customerEmail: email, metadata, paymentIntent: "pi_test_1" })

const itemsMetadata = JSON.stringify(fulfillmentLines)

const CONFIRMATION_DELIVERY = { idempotencyKey: "order-confirmation/order-1", orderEmail: { kind: "order-confirmation" } }

const UNSENT_CONFIRMATION = { label: "Order confirmation", metadata: CONFIRMATION_DELIVERY, orderId: "order-1", willRetry: true }

const sessionCheckedOutOn = (origin: string, metadata: Stripe.Metadata): Stripe.Checkout.Session =>
  checkoutSession({
    amountTotal: AMOUNT_TOTAL,
    customerEmail: "anna@example.com",
    metadata,
    paymentIntent: "pi_test_1",
    returnUrl: `${origin}/en-US/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
  })

const dispatch = async (event: Stripe.Event): Promise<void> => {
  const handler = webhookHandlers[event.type]
  if (handler === undefined) {
    throw new Error(`no webhook handler is registered for ${event.type}`)
  }

  await handler(event)
}

const sentEmail = () => {
  const [call] = sendEmail.mock.calls
  if (call === undefined) {
    throw new Error("no confirmation email was sent")
  }

  return call[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  fulfillCheckout.mockResolvedValue("order-1")
  getOrderTotalsForEmail.mockResolvedValue(PLACED_ORDER)
  getCheckoutEmailContext.mockResolvedValue(undefined)
  getFulfillmentTimeAttributesByVariantId.mockResolvedValue(new Map())
  loadWithdrawalFormAttachment.mockResolvedValue(WITHDRAWAL_FORM)
  embedEmailImages.mockResolvedValue({ attachments: [], sources: new Map() })
  sendNewOrderEmail.mockResolvedValue(true)
  paymentIntentsRetrieve.mockResolvedValue({ payment_method: { type: "blik" } })
  sendEmail.mockResolvedValue(undefined)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe("order confirmation email", () => {
  it("sends the confirmation to the address on the order in the store locale", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(sendEmail).toHaveBeenCalledOnce()
    expect(sentEmail().to).toBe("anna@example.com")
    expect(sentEmail().idempotencyKey).toBe("order-confirmation/order-1")
    expect(sentEmail().subject).toBe(polishCopy.subject)
    expect(sentEmail().react.type).toBe(OrderConfirmation)
    expect(sentEmail().react.props.locale).toBe("pl-PL")
    expect(sentEmail().react.props.seller).toMatchObject({ legalName: "Pracownia Testowa Anna Nowak", nip: "5260250274" })
  })

  it("translates the subject into the locale the checkout was made in", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata, locale: "en-US" })))

    expect(sentEmail().subject).toBe(englishCopy.subject)
    expect(sentEmail().react.props.locale).toBe("en-US")
  })

  it("reports the totals persisted on the order rather than re-deriving them", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    const { props } = sentEmail().react

    expect(getOrderTotalsForEmail).toHaveBeenCalledWith("order-1")
    expect(props.subtotal).toBe(ITEMS_TOTAL)
    expect(props.shippingTotal).toBe(SHIPPING_TOTAL)
    expect(props.total).toBe(AMOUNT_TOTAL)
    expect(props.taxTotal).toBe(12_080)
    expect(props.currency).toBe("PLN")
    expect(props.orderNumber).toBe("MRT-2026-00042")
  })

  it("records the confirmation as unsent while the order cannot be read back", async () => {
    getOrderTotalsForEmail.mockResolvedValue(undefined)
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ ...UNSENT_CONFIRMATION, failure: "Order order-1 was not found" })
  })

  it("labels the payment method Stripe reports for the intent", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(paymentIntentsRetrieve).toHaveBeenCalledWith("pi_test_1", { expand: ["payment_method"] })
    expect(sentEmail().react.props.details.paymentMethod).toBe(polishCopy.paymentMethods.blik)
  })

  it("marks the delivery and address details unavailable while no checkout row is found", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    const { details } = sentEmail().react.props

    expect(details.billingAddress).toBe(polishCopy.unavailable)
    expect(details.destination).toStrictEqual({ address: polishCopy.unavailable, kind: "address" })
    expect(details.deliveryMethod).toBe(polishCopy.unavailable)
  })
})

describe("order confirmation email from the checkout", () => {
  it("reads the checkout the session metadata points at", async () => {
    getCheckoutEmailContext.mockResolvedValue({
      billingAddress: null,
      billingAddressId: "adr-1",
      billingCompanyName: "Pracownia Złotnicza sp. z o.o.",
      billingNip: "5260001246",
      customerNote: null,
      deliveryMethod: { names: { "en-US": "InPost parcel locker", "pl-PL": "Paczkomat InPost" }, type: "locker" },
      lockerId: "WAW01A",
      lockerPoint: JSON.stringify({ buildingNumber: "1", city: "Warszawa", postalCode: "00-001", street: "Marszałkowska" }),
      shippingAddress: {
        address1: "ul. Mokotowska 12/4",
        address2: null,
        city: "Warszawa",
        countryCode: "PL",
        firstName: "Anna",
        lastName: "Kowalska",
        phone: "+48 600 123 456",
        postalCode: "00-640",
      },
      shippingAddressId: "adr-1",
    })

    await dispatch(checkoutSessionCompletedEvent(paidSession({ checkoutId: "chk-1", items: itemsMetadata })))

    const { details } = sentEmail().react.props

    expect(getCheckoutEmailContext).toHaveBeenCalledWith("chk-1")
    expect(details.deliveryMethod).toBe("Paczkomat InPost")
    expect(details.billingAddress).toBe(polishCopy.billingSameAsShipping)
    expect(details.destination).toStrictEqual({
      kind: "locker",
      locker: "WAW01A\nMarszałkowska 1\n00-001 Warszawa",
      recipient: "Anna Kowalska\n+48 600 123 456",
    })
    expect(details.estimatedDelivery).toBe(polishCopy.estimatedDelivery.locker)
    expect(details.companyInvoice).toBe(`Pracownia Złotnicza sp. z o.o.\n${polishCopy.nipLabel} 5260001246`)
  })

  it("invites the buyer of an order without an account to create one", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(sentEmail().react.props.accountCta).toStrictEqual({
      href: "http://127.0.0.1:3000/auth/sign-up",
      isGuest: true,
      label: polishCopy.createAccountCta,
    })
  })

  it.each([
    ["a signed-in buyer's order", { items: itemsMetadata, userId: "usr-1" }],
    ["a guest checkout the store filed under the verified account with its email", { items: itemsMetadata }],
  ])("links %s to the order in the account", async (_case, metadata) => {
    getOrderTotalsForEmail.mockResolvedValue({ ...PLACED_ORDER, userId: "usr-1" })

    await dispatch(checkoutSessionCompletedEvent(paidSession(metadata)))

    expect(sentEmail().react.props.accountCta).toStrictEqual({
      href: "http://127.0.0.1:3000/account/orders/order-1",
      isGuest: false,
      label: polishCopy.viewOrderCta,
    })
  })

  it("links every ordered item to its product page in the locale of the order", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata, locale: "en-US" })))

    expect(sentEmail().react.props.items).toStrictEqual([
      {
        imageUrl: "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/aurora.jpg",
        price: 24_900,
        productUrl: "http://127.0.0.1:3000/en-US/products/bransoletka-aurora",
        qty: 2,
        title: "Bransoletka Aurora",
      },
    ])
  })
})

describe("order confirmation email as the confirmation of the contract", () => {
  it("states the fulfillment time of § 7 when no ordered product's page gives one", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(getFulfillmentTimeAttributesByVariantId).toHaveBeenCalledExactlyOnceWith(["var-aurora"])
    expect(sentEmail().react.props.details.fulfillmentTime).toBe(
      `${polishCopy.fulfillmentTime.fallback}\n${polishCopy.fulfillmentTime.note}`,
    )
  })

  it("states the longest fulfillment time the ordered products' pages give, in the language of the order", async () => {
    const lines = [
      ...fulfillmentLines,
      { handle: "pierscionek-luna", price: 31_900, qty: 1, title: "Pierścionek Luna", variantId: "var-luna" },
    ]
    getFulfillmentTimeAttributesByVariantId.mockResolvedValue(
      new Map<string, FulfillmentTimeAttribute>([
        [
          "var-luna",
          {
            allowedValues: [{ labels: { "en-US": "3 weeks", "pl-PL": "3 tygodnie" }, value: "3-tygodnie" }],
            type: "select",
            unit: null,
            value: "3-tygodnie",
          },
        ],
      ]),
    )

    const items = JSON.stringify(lines)

    await dispatch(checkoutSessionCompletedEvent(paidSession({ items, locale: "en-US" })))

    expect(getFulfillmentTimeAttributesByVariantId).toHaveBeenCalledExactlyOnceWith(["var-aurora", "var-luna"])
    expect(sentEmail().react.props.details.fulfillmentTime).toBe(`3 weeks\n${englishCopy.fulfillmentTime.note}`)
  })

  it("embeds the ordered products' images and attaches them after the withdrawal form", async () => {
    const image = "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/aurora.jpg"
    const inlineImage = { content: "aW1hZ2U=", contentId: "image-1", filename: "aurora.jpg" }
    const sources = new Map([[image, "cid:image-1"]])
    embedEmailImages.mockResolvedValue({ attachments: [inlineImage], sources })

    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(embedEmailImages).toHaveBeenCalledExactlyOnceWith([image])
    expect(sentEmail().attachments).toStrictEqual([WITHDRAWAL_FORM, inlineImage])
    expect(sentEmail().react.props.inlineImageSources).toBe(sources)
  })

  it("attaches the model withdrawal form read from the deployment the order was placed on", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(loadWithdrawalFormAttachment).toHaveBeenCalledExactlyOnceWith("http://127.0.0.1:3000")
    expect(sentEmail().attachments).toStrictEqual([WITHDRAWAL_FORM])
  })

  it("links the terms, the returns page, the privacy policy and the order's withdrawal form in the locale of the order", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata, locale: "en-US" })))

    expect(sentEmail().react.props.legalLinks).toStrictEqual({
      exchangesAndReturns: "http://127.0.0.1:3000/en-US/exchanges-and-returns",
      privacyPolicy: "http://127.0.0.1:3000/en-US/privacy-policy",
      termsOfService: "http://127.0.0.1:3000/en-US/terms-of-service",
      withdrawal: "http://127.0.0.1:3000/en-US/withdraw-from-contract?order=MRT-2026-00042",
    })
  })
})

describe("order confirmation email links", () => {
  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://preview.martebizuteria.pl",
    "https://martebizuteria-preview.pjborowiecki.workers.dev",
    "https://martebizuteria.pl",
    "https://martebizuteria.pjborowiecki.workers.dev",
  ])("links an order checked out on %s back to that address", async (origin) => {
    await dispatch(checkoutSessionCompletedEvent(sessionCheckedOutOn(origin, { items: itemsMetadata, locale: "en-US" })))

    expect(sentEmail().react.props.accountCta.href).toBe(`${origin}/en-US/auth/sign-up`)
    expect(sentEmail().react.props.items[0]?.productUrl).toBe(`${origin}/en-US/products/bransoletka-aurora`)
    expect(sentEmail().react.props.legalLinks.termsOfService).toBe(`${origin}/en-US/terms-of-service`)
    expect(loadWithdrawalFormAttachment).toHaveBeenCalledExactlyOnceWith(origin)
  })

  it.each(["preview", "production"])(
    "links a checkout made on 127.0.0.1 back to 127.0.0.1 when the %s deployment's webhook fulfils it",
    async (mode) => {
      vi.stubEnv("MODE", mode)
      getOrderTotalsForEmail.mockResolvedValue({ ...PLACED_ORDER, userId: "usr-1" })

      await dispatch(checkoutSessionCompletedEvent(sessionCheckedOutOn("http://127.0.0.1:3000", { items: itemsMetadata, userId: "usr-1" })))

      expect(sentEmail().react.props.accountCta.href).toBe("http://127.0.0.1:3000/account/orders/order-1")
      expect(sentEmail().react.props.items[0]?.productUrl).toBe("http://127.0.0.1:3000/products/bransoletka-aurora")
    },
  )

  it.each([
    "https://martebizuteria.pl.attacker.example",
    "https://fakemartebizuteria.pl",
    "https://other.pjborowiecki.workers.dev",
    "http://martebizuteria.pl",
    "http://localhost:3001",
    "http://[::1]:3000",
  ])("still fulfils an order whose session returns to %s, and records the confirmation as unsent", async (origin) => {
    const event = checkoutSessionCompletedEvent(sessionCheckedOutOn(origin, { items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({ ...UNSENT_CONFIRMATION, failure: "FORBIDDEN" })
  })

  it("still fulfils an order whose session has no return URL, and records why the confirmation was not sent", async () => {
    const session = checkoutSession({
      amountTotal: AMOUNT_TOTAL,
      customerEmail: "anna@example.com",
      metadata: { items: itemsMetadata },
      paymentIntent: "pi_test_1",
      returnUrl: null,
    })

    await expect(dispatch(checkoutSessionCompletedEvent(session))).resolves.toBeUndefined()

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      ...UNSENT_CONFIRMATION,
      failure: "The Stripe session has no return URL to link the email to",
    })
  })
})

describe("order confirmation email delivery", () => {
  it("uses zero totals and the store defaults when Stripe omits optional session data", async () => {
    await dispatch(checkoutSessionCompletedEvent(checkoutSession({ currency: null, customerEmail: "anna@example.com" })))

    expect(fulfillCheckout).toHaveBeenCalledWith({
      currency: "PLN",
      lines: [],
      locale: "pl-PL",
      paidAmount: 0,
      transactionId: "cs_test_1",
    })
    expect(recordOrderPaymentCapturedAudit).toHaveBeenCalledWith("order-1", { detail: "0,00 PLN", resourceId: "order-1" })
    expect(getCheckoutEmailContext).not.toHaveBeenCalled()
  })

  it("does not look up an empty checkout ID", async () => {
    await dispatch(checkoutSessionCompletedEvent(paidSession({ checkoutId: "", items: itemsMetadata })))

    expect(getCheckoutEmailContext).not.toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalledOnce()
  })

  it("sends the confirmation to the order's address when Stripe collected customer details without an email address", async () => {
    await dispatch(
      checkoutSessionCompletedEvent(
        checkoutSession({
          customerDetails: {
            address: null,
            business_name: null,
            email: null,
            individual_name: null,
            name: "Anna",
            phone: null,
            tax_exempt: null,
            tax_ids: null,
          },
        }),
      ),
    )

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sentEmail().to).toBe("anna@example.com")
  })

  it("audits a preparation failure that is not an error without retrying a fulfilled order", async () => {
    getCheckoutEmailContext.mockRejectedValue("D1 is unavailable")
    const event = checkoutSessionCompletedEvent(paidSession({ checkoutId: "chk-1", items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ ...UNSENT_CONFIRMATION, failure: "D1 is unavailable" })
  })

  it("sends a signed-in shopper's confirmation to the order's address, not to the one Stripe now holds for the account", async () => {
    getOrderTotalsForEmail.mockResolvedValue({ ...PLACED_ORDER, email: "first-tab@example.com", userId: "user-1" })
    const session = checkoutSession({
      amountTotal: AMOUNT_TOTAL,
      customerDetails: {
        address: null,
        business_name: null,
        email: "second-tab@example.com",
        individual_name: null,
        name: null,
        phone: null,
        tax_exempt: null,
        tax_ids: null,
      },
      metadata: { items: itemsMetadata, userId: "user-1" },
    })

    await dispatch(checkoutSessionCompletedEvent(session))

    expect(sentEmail().to).toBe("first-tab@example.com")
  })

  it("records a confirmation that could not be prepared against the order instead of failing the webhook", async () => {
    getCheckoutEmailContext.mockRejectedValue(new Error("D1_ERROR: no such table"))
    const event = checkoutSessionCompletedEvent(paidSession({ checkoutId: "chk-1", items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ ...UNSENT_CONFIRMATION, failure: "D1_ERROR: no such table" })
  })

  it("records the confirmation as unsent rather than sending it without the withdrawal form", async () => {
    loadWithdrawalFormAttachment.mockRejectedValue(
      new Error("The withdrawal form /forms/formularz_zwrotu.pdf could not be read from the static assets: HTTP 404"),
    )
    const event = checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      ...UNSENT_CONFIRMATION,
      failure: "The withdrawal form /forms/formularz_zwrotu.pdf could not be read from the static assets: HTTP 404",
    })
  })

  it("hands the refusal Resend reports to the audit trail and keeps the webhook successful", async () => {
    sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)
    const event = checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      ...UNSENT_CONFIRMATION,
      failure: DOMAIN_NOT_VERIFIED,
      label: "Order confirmation → anna@example.com",
    })
  })
})

describe("order confirmation email retries", () => {
  it("rebuilds a refused confirmation from the session for its retry under the same idempotency key", async () => {
    sendEmail.mockResolvedValueOnce(DOMAIN_NOT_VERIFIED)

    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))
    await vi.runAllTimersAsync()

    expect(fulfillCheckout).toHaveBeenCalledOnce()
    expect(sendEmail.mock.calls.map(([options]) => options.idempotencyKey)).toStrictEqual([
      "order-confirmation/order-1",
      "order-confirmation/order-1",
    ])
    expect(sendEmail.mock.calls[1]?.[0].react.props.items).toStrictEqual(sentEmail().react.props.items)
    expect(recordOrderEmailOutcome).toHaveBeenLastCalledWith({
      failure: undefined,
      label: "Order confirmation → anna@example.com",
      metadata: CONFIRMATION_DELIVERY,
      orderId: "order-1",
      willRetry: false,
    })
  })

  it("keeps the confirmation email running for the Worker when Stripe stops waiting for the answer", async () => {
    const kept: Promise<unknown>[] = []
    const event = checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata }))

    await executionContextStorage.run(
      {
        waitUntil: (task) => {
          kept.push(task)
        },
      },
      () => dispatch(event),
    )
    await Promise.all(kept)

    expect(kept).toHaveLength(1)
    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      failure: undefined,
      label: "Order confirmation → anna@example.com",
      metadata: CONFIRMATION_DELIVERY,
      orderId: "order-1",
      willRetry: false,
    })
    expect(sendNewOrderEmail).toHaveBeenCalledOnce()
  })
})

describe("new order email to the shop", () => {
  it("tells the shop about the order the session created, linked on the deployment the checkout returned to", async () => {
    await dispatch(checkoutSessionCompletedEvent(sessionCheckedOutOn("https://preview.martebizuteria.pl", { items: itemsMetadata })))

    expect(sendNewOrderEmail).toHaveBeenCalledExactlyOnceWith(
      "order-1",
      "https://preview.martebizuteria.pl/en-US/checkout?success=true&session_id={CHECKOUT_SESSION_ID}",
    )
  })

  it("tells the shop about a free order the customer paid nothing for", async () => {
    const session = checkoutSession({ amountTotal: 0, metadata: { items: itemsMetadata }, paymentStatus: "no_payment_required" })

    await dispatch(checkoutSessionCompletedEvent(session))

    expect(sendNewOrderEmail).toHaveBeenCalledOnce()
  })

  it("tells the shop about an order whose confirmation the customer could not be sent", async () => {
    sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)
    const event = checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata }))

    await expect(dispatch(event)).resolves.toBeUndefined()

    expect(sendNewOrderEmail).toHaveBeenCalledOnce()
  })

  it("sends nothing to the shop when Stripe redelivers the event of an order already created", async () => {
    fulfillCheckout.mockResolvedValue(undefined)

    await dispatch(checkoutSessionCompletedEvent(paidSession({ items: itemsMetadata })))

    expect(sendNewOrderEmail).not.toHaveBeenCalled()
  })
})
