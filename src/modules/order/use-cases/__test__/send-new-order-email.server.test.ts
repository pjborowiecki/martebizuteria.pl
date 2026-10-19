import { type ComponentProps, type ReactElement } from "react"

import { render } from "react-email"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.new-order.json"
import polishCopy from "~/messages/pl-PL/emails.new-order.json"
import { type NewOrder } from "~/src/presentation/emails/new-order"

type NewOrderElement = ReactElement<ComponentProps<typeof NewOrder>>

const { env, getAdminOrderDetailRow, getAdminOrderItemRows, loadNamespace, recordOrderEmailOutcome, sendEmail } = vi.hoisted(() => ({
  env: { RESEND_EMAIL_FROM: "orders@marte.test" },
  getAdminOrderDetailRow: vi.fn(),
  getAdminOrderItemRows: vi.fn(),
  loadNamespace: vi.fn(),
  recordOrderEmailOutcome: vi.fn(),
  sendEmail:
    vi.fn<
      (options: {
        readonly idempotencyKey?: string
        readonly react: NewOrderElement
        readonly subject: string
        readonly to: string
      }) => Promise<string | undefined>
    >(),
}))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { paymentIntents: { retrieve: vi.fn() } } }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/use-intl/i18n.messages", () => ({ loadNamespace }))
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => ({
  recordOrderEmailOutcome,
}))
vi.mock("~/src/modules/order/order.accessors", () => ({ getAdminOrderDetailRow, getAdminOrderItemRows }))

import { sendNewOrderEmail } from "~/src/modules/order/use-cases/send-new-order-email.server"

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

const ORDER_ID = "order-abcdef12"

const ORDER_NUMBER = "MRT-2026-00042"

const RETURN_URL = "https://preview.martebizuteria.pl/en-US/checkout?success=true&session_id={CHECKOUT_SESSION_ID}"

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const shippingSnapshot = {
  address1: "ul. Mokotowska 12/4",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48 600 123 456",
  postalCode: "00-640",
  province: null,
  type: "shipping",
}

const orderRow = {
  addresses: [shippingSnapshot, { ...shippingSnapshot, address1: "ul. Fakturowa 1", type: "billing" }],
  billingCompanyName: null,
  billingNip: null,
  checkout: null,
  currencyCode: "PLN",
  customerNote: "  Please gift-wrap the bracelet.  ",
  deliveryMethod: { courier: { name: "InPost" }, names: { "en-US": "InPost locker", "pl-PL": "InPost Paczkomat" }, type: "locker" },
  email: "anna@example.com",
  lockerId: "WAW01M",
  lockerPoint: JSON.stringify({ buildingNumber: "1", city: "Warszawa", postalCode: "00-001", street: "Marszałkowska" }),
  orderNumber: ORDER_NUMBER,
  total: 64_600,
}

const itemRows = [
  {
    id: "item-aurora",
    productHandle: "bransoletka-aurora",
    quantity: 1,
    sku: "MRT-0101",
    thumbnail: null,
    title: "Bransoletka Aurora",
    total: 24_900,
    unitPrice: 24_900,
    variantTitle: "Złoto",
  },
  {
    id: "item-luna",
    productHandle: null,
    quantity: 2,
    sku: null,
    thumbnail: "products/luna.jpg",
    title: "Kolczyki Luna",
    total: 37_800,
    unitPrice: 18_900,
    variantTitle: null,
  },
]

const sentEmail = () => {
  const [call] = sendEmail.mock.calls
  if (call === undefined) {
    throw new Error("no new order email was sent")
  }

  return call[0]
}

const NOTIFICATION_DELIVERY = { idempotencyKey: `new-order/${ORDER_ID}`, orderEmail: { kind: "new-order" } }

const UNSENT_NOTIFICATION = { label: "New order notification", metadata: NOTIFICATION_DELIVERY, orderId: ORDER_ID, willRetry: true }

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  getAdminOrderDetailRow.mockResolvedValue(orderRow)
  getAdminOrderItemRows.mockResolvedValue(itemRows)
  loadNamespace.mockResolvedValue(polishCopy)
  sendEmail.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("sendNewOrderEmail", () => {
  it("emails the shop's sender address in the shop's language with the order number in the subject", async () => {
    await sendNewOrderEmail(ORDER_ID, RETURN_URL)

    expect(getAdminOrderDetailRow).toHaveBeenCalledWith(ORDER_ID)
    expect(getAdminOrderItemRows).toHaveBeenCalledWith(ORDER_ID)
    expect(loadNamespace).toHaveBeenCalledWith({ locale: "pl-PL", namespace: "emails.new-order" })
    expect(sentEmail().to).toBe("orders@marte.test")
    expect(sentEmail().idempotencyKey).toBe(`new-order/${ORDER_ID}`)
    expect(sentEmail().subject).toBe(`Nowe zamówienie ${ORDER_NUMBER} — M'Arte`)
    expect(sentEmail().react.props).toMatchObject({ currency: "PLN", locale: "pl-PL", orderNumber: ORDER_NUMBER, total: 64_600 })
  })

  it("lists the ordered pieces the way the admin order page does", async () => {
    await sendNewOrderEmail(ORDER_ID, RETURN_URL)

    expect(sentEmail().react.props.items).toStrictEqual([
      {
        id: "item-aurora",
        imageUrl: undefined,
        productHandle: "bransoletka-aurora",
        quantity: 1,
        sku: "MRT-0101",
        title: "Bransoletka Aurora",
        totalMinorUnits: 24_900,
        unitPriceMinorUnits: 24_900,
        variantTitle: "Złoto",
      },
      {
        id: "item-luna",
        imageUrl: "products/luna.jpg",
        productHandle: undefined,
        quantity: 2,
        sku: undefined,
        title: "Kolczyki Luna",
        totalMinorUnits: 37_800,
        unitPriceMinorUnits: 18_900,
        variantTitle: undefined,
      },
    ])
  })

  it("names the customer's contact, the parcel locker the order goes to and the note", async () => {
    await sendNewOrderEmail(ORDER_ID, RETURN_URL)

    expect(sentEmail().react.props.details).toStrictEqual({
      companyInvoice: undefined,
      customer: "Anna Kowalska\nanna@example.com\n+48 600 123 456",
      customerNote: "Please gift-wrap the bracelet.",
      deliveryMethod: "InPost Paczkomat",
      destination: { kind: "locker", locker: "WAW01M\nMarszałkowska 1\n00-001 Warszawa", recipient: undefined },
    })
  })

  it("names the company, its NIP and the billing address when the customer asked for an invoice", async () => {
    getAdminOrderDetailRow.mockResolvedValue({
      ...orderRow,
      billingCompanyName: "Pracownia Złotnicza sp. z o.o.",
      billingNip: "5260001246",
    })

    await sendNewOrderEmail(ORDER_ID, RETURN_URL)

    expect(sentEmail().react.props.details.companyInvoice).toBe(
      `Pracownia Złotnicza sp. z o.o.\n${polishCopy.nipLabel} 5260001246\nul. Fakturowa 1\n00-640 Warszawa, Polska`,
    )
  })

  it("names the company to invoice even when the order kept no billing address", async () => {
    getAdminOrderDetailRow.mockResolvedValue({
      ...orderRow,
      addresses: [shippingSnapshot],
      billingCompanyName: null,
      billingNip: "5260001246",
    })

    await sendNewOrderEmail(ORDER_ID, RETURN_URL)

    expect(sentEmail().react.props.details.companyInvoice).toBe(`${polishCopy.nipLabel} 5260001246`)
  })

  it("keeps the second address line and a missing postal code out of the way", async () => {
    getAdminOrderDetailRow.mockResolvedValue({
      ...orderRow,
      addresses: [{ ...shippingSnapshot, address2: "lokal 3", phone: null, postalCode: null }],
      deliveryMethod: { courier: { name: "InPost" }, names: { "en-US": "InPost courier", "pl-PL": "Kurier InPost" }, type: "courier" },
    })

    await sendNewOrderEmail(ORDER_ID, RETURN_URL)

    expect(sentEmail().react.props.details).toMatchObject({
      customer: "Anna Kowalska\nanna@example.com",
      destination: { address: "ul. Mokotowska 12/4\nlokal 3\nWarszawa, Polska", kind: "address" },
    })
  })

  it("marks what an order without an address, a delivery method or a note does not have", async () => {
    getAdminOrderDetailRow.mockResolvedValue({ ...orderRow, addresses: [], customerNote: "   ", deliveryMethod: null })
    loadNamespace.mockResolvedValue(englishCopy)

    await sendNewOrderEmail(ORDER_ID, RETURN_URL)

    expect(sentEmail().react.props.details).toStrictEqual({
      companyInvoice: undefined,
      customer: "anna@example.com",
      customerNote: undefined,
      deliveryMethod: englishCopy.unavailable,
      destination: { address: englishCopy.unavailable, kind: "address" },
    })
  })

  it("leaves the note out when the customer wrote none", async () => {
    getAdminOrderDetailRow.mockResolvedValue({ ...orderRow, customerNote: null })

    await sendNewOrderEmail(ORDER_ID, RETURN_URL)

    expect(sentEmail().react.props.details.customerNote).toBeUndefined()
  })

  it("links the button to the order in the admin on the deployment the checkout returned to", async () => {
    await sendNewOrderEmail(ORDER_ID, "http://127.0.0.1:3000/en-US/checkout?success=true")

    const html = await render(sentEmail().react)

    expect(sentEmail().react.props.adminOrderUrl).toBe(`http://127.0.0.1:3000/admin/orders/${ORDER_ID}`)
    expect(html).toContain(`href="http://127.0.0.1:3000/admin/orders/${ORDER_ID}"`)
  })
})

describe("sendNewOrderEmail outcome", () => {
  it("records a successful send against the order and reports it", async () => {
    await expect(sendNewOrderEmail(ORDER_ID, RETURN_URL)).resolves.toBe(true)

    expect(recordOrderEmailOutcome).toHaveBeenCalledExactlyOnceWith({
      failure: undefined,
      label: "New order notification → orders@marte.test",
      metadata: NOTIFICATION_DELIVERY,
      orderId: ORDER_ID,
      willRetry: false,
    })
  })

  it("records the refusal reported by the email transport instead of throwing", async () => {
    sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)

    await expect(sendNewOrderEmail(ORDER_ID, RETURN_URL)).resolves.toBe(false)

    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      ...UNSENT_NOTIFICATION,
      failure: DOMAIN_NOT_VERIFIED,
      label: "New order notification → orders@marte.test",
    })
  })

  it("records a notification whose session has no return URL to link it to", async () => {
    await sendNewOrderEmail(ORDER_ID, undefined)

    expect(getAdminOrderDetailRow).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({
      ...UNSENT_NOTIFICATION,
      failure: "The Stripe session has no return URL to link the email to",
    })
  })

  it("records a notification whose session returned to a host no deployment serves", async () => {
    await expect(sendNewOrderEmail(ORDER_ID, "https://attacker.example/en-US/checkout")).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(`New order notification for order ${ORDER_ID} could not be prepared:`, expect.any(Error))
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ ...UNSENT_NOTIFICATION, failure: "FORBIDDEN" })
  })

  it("records a notification that has no order to go out for", async () => {
    getAdminOrderDetailRow.mockResolvedValue(undefined)

    await sendNewOrderEmail(ORDER_ID, RETURN_URL)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ ...UNSENT_NOTIFICATION, failure: "The order could not be found" })
  })

  it("records a notification that could not be prepared against the order instead of throwing", async () => {
    getAdminOrderItemRows.mockRejectedValue(new Error("D1_ERROR: no such table"))

    await expect(sendNewOrderEmail(ORDER_ID, RETURN_URL)).resolves.toBe(false)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(recordOrderEmailOutcome).toHaveBeenCalledWith({ ...UNSENT_NOTIFICATION, failure: "D1_ERROR: no such table" })
  })
})
