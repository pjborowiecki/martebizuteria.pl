import { render } from "react-email"
import { createTranslator } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { TEST_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

import { STANDARD_VAT_BASIS_POINTS } from "~/src/modules/_core/constants/tax"
import { formatPrice } from "~/src/modules/_core/utils/currency"

import englishCopy from "~/messages/en-US/emails.order-confirmation.json"
import polishCopy from "~/messages/pl-PL/emails.order-confirmation.json"
import {
  ORDER_CONFIRMATION_NAMESPACE,
  OrderConfirmation,
  type OrderConfirmationDetails,
  type OrderConfirmationItem,
  type OrderConfirmationLegalLinks,
} from "~/src/presentation/emails/order-confirmation"

const ORDER_NUMBER = "MRT-2026-00042"

const details: OrderConfirmationDetails = {
  billingAddress: "Same as shipping",
  companyInvoice: undefined,
  deliveryMethod: "DPD courier",
  destination: { address: "Anna Kowalska\nul. Mokotowska 12/4\n00-640 Warszawa", kind: "address" },
  estimatedDelivery: "2-4 business days after dispatch",
  fulfillmentTime: `3 weeks\n${englishCopy.fulfillmentTime.note}`,
  paymentMethod: "Card",
}

const items: OrderConfirmationItem[] = [
  {
    imageUrl: "https://assets.test/aurora.jpg",
    price: 24_900,
    productUrl: "https://martebizuteria.pl/products/bransoletka-aurora",
    qty: 1,
    title: "Bransoletka Aurora",
  },
  {
    imageUrl: "https://assets.test/luna.jpg",
    price: 18_900,
    productUrl: "https://martebizuteria.pl/products/kolczyki-luna",
    qty: 2,
    title: "Kolczyki Luna",
  },
]

const legalLinks: OrderConfirmationLegalLinks = {
  exchangesAndReturns: "https://martebizuteria.pl/en-US/exchanges-and-returns",
  privacyPolicy: "https://martebizuteria.pl/en-US/privacy-policy",
  termsOfService: "https://martebizuteria.pl/en-US/terms-of-service",
  withdrawal: "https://martebizuteria.pl/en-US/withdraw-from-contract?order=MRT-2026-00042",
}

const guestCta = { href: "https://martebizuteria.pl/auth/sign-up", isGuest: true, label: "Create an account" }

const customerCta = { href: "https://martebizuteria.pl/account/orders/abc", isGuest: false, label: "View your order" }

const renderConfirmation = (
  accountCta: { href: string; isGuest: boolean; label: string },
  plainText = true,
  {
    confirmationDetails = details,
    discountTotal = 0,
    inlineImageSources = new Map<string, string>(),
  }: Readonly<{
    confirmationDetails?: OrderConfirmationDetails
    discountTotal?: number
    inlineImageSources?: ReadonlyMap<string, string>
  }> = {},
): Promise<string> =>
  render(
    <OrderConfirmation
      accountCta={accountCta}
      currency="PLN"
      details={confirmationDetails}
      inlineImageSources={inlineImageSources}
      items={items}
      legalLinks={legalLinks}
      locale="en-US"
      messages={englishCopy}
      discountTotal={discountTotal}
      orderNumber={ORDER_NUMBER}
      seller={TEST_SELLER_DETAILS}
      shippingTotal={1900}
      subtotal={62_700}
      taxBasisPoints={STANDARD_VAT_BASIS_POINTS}
      taxTotal={12_080}
      total={64_600}
    />,
    plainText ? { plainText: true } : { plainText: false },
  )

describe("OrderConfirmation", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(ORDER_CONFIRMATION_NAMESPACE).toBe("emails.order-confirmation")
  })

  it("shortens the order id to an eight character uppercase reference", async () => {
    const text = await renderConfirmation(customerCta)

    expect(text).toContain(ORDER_NUMBER)
  })

  it("prices each line by unit and by line total", async () => {
    const text = await renderConfirmation(customerCta)

    expect(text).toContain("1 × PLN 249.00 — PLN 249.00")
    expect(text).toContain("2 × PLN 189.00 — PLN 378.00")
  })

  it("reports the subtotal, the shipping cost and the grand total", async () => {
    const text = await renderConfirmation(customerCta)

    expect(text).toContain(`${englishCopy.subtotalLabel}: PLN 627.00`)
    expect(text).toContain(`${englishCopy.shippingLabel}: PLN 19.00`)
    expect(text).toContain(`${englishCopy.totalLabel}: PLN 646.00`)
  })

  it("subtracts the redeemed discount on its own line", async () => {
    const text = await renderConfirmation(customerCta, true, { discountTotal: 5000 })

    expect(text).toContain(`${englishCopy.discountLabel}: −${formatPrice(5000, "PLN", "en-US")}`)
  })

  it("leaves the discount line out of an order without one", async () => {
    const text = await renderConfirmation(customerCta)

    expect(text).not.toContain(englishCopy.discountLabel)
  })

  it("states the VAT contained in the total", async () => {
    const text = await renderConfirmation(customerCta)

    expect(text).toContain(`Includes VAT (23%): ${formatPrice(12_080, "PLN", "en-US")}`)
  })

  it("shows an image embedded in the email by its content id and links the images that were not", async () => {
    const html = await renderConfirmation(guestCta, false, {
      inlineImageSources: new Map([["https://assets.test/aurora.jpg", "cid:image-1"]]),
    })

    expect(html).toContain('src="cid:image-1"')
    expect(html).not.toContain('src="https://assets.test/aurora.jpg"')
    expect(html).toContain('src="https://assets.test/luna.jpg"')
  })

  it("lists every item with its own product link", async () => {
    const html = await renderConfirmation(customerCta, false)

    for (const item of items) {
      expect(html).toContain(item.title)
      expect(html).toContain(`href="${item.productUrl}"`)
      expect(html).toContain(`src="${item.imageUrl}"`)
    }
  })

  it("names the parcel locker as the destination and the customer as the recipient InPost texts", async () => {
    const text = await renderConfirmation(customerCta, true, {
      confirmationDetails: {
        ...details,
        destination: { kind: "locker", locker: "WAW01M\nMarszałkowska 1\n00-001 Warszawa", recipient: "Anna Kowalska\n+48 600 123 456" },
      },
    })

    expect(text).toContain(`${englishCopy.lockerLabel}\n\nWAW01M Marszałkowska 1 00-001 Warszawa`)
    expect(text).toContain(`${englishCopy.recipientLabel}\n\nAnna Kowalska +48 600 123 456`)
    expect(text).not.toContain(englishCopy.shippingAddressLabel)
  })

  it("leaves the recipient out when the order kept none", async () => {
    const text = await renderConfirmation(customerCta, true, {
      confirmationDetails: { ...details, destination: { kind: "locker", locker: "WAW01M", recipient: undefined } },
    })

    expect(text).toContain(`${englishCopy.lockerLabel}\n\nWAW01M`)
    expect(text).not.toContain(englishCopy.recipientLabel)
  })

  it("repeats the delivery and payment details the shopper chose", async () => {
    const text = await renderConfirmation(customerCta)

    expect(text).toContain(details.paymentMethod)
    expect(text).toContain(details.deliveryMethod)
    expect(text).toContain("ul. Mokotowska 12/4")
    expect(text).toContain(details.billingAddress)
    expect(text).toContain(`${englishCopy.fulfillmentTimeLabel}\n\n3 weeks`)
    expect(text).toContain(englishCopy.fulfillmentTime.note)
    expect(text).toContain(details.estimatedDelivery)
  })

  it("names the company to be invoiced only when the shopper asked for an invoice", async () => {
    await expect(renderConfirmation(customerCta)).resolves.not.toContain(englishCopy.companyInvoiceLabel)

    const companyInvoice = "Pracownia Złotnicza sp. z o.o.\nNIP 5260001246"
    const text = await renderConfirmation(customerCta, true, { confirmationDetails: { ...details, companyInvoice } })
    const html = await renderConfirmation(customerCta, false, { confirmationDetails: { ...details, companyInvoice } })

    expect(text).toContain(
      `${englishCopy.billingAddressLabel}\n\n${details.billingAddress}\n\n${englishCopy.companyInvoiceLabel}\n\nPracownia Złotnicza sp. z o.o. NIP 5260001246`,
    )
    expect(html).toContain(companyInvoice)
  })

  it("invites a guest to open an account before showing the button", async () => {
    const text = await renderConfirmation(guestCta)

    expect(text).toContain(englishCopy.accountCtaNote)
    expect(text).toContain(guestCta.label)
  })

  it("omits the account note for a signed-in customer", async () => {
    const text = await renderConfirmation(customerCta)

    expect(text).not.toContain(englishCopy.accountCtaNote)
    expect(text).toContain(customerCta.label)
  })

  it("points the button at the call to action it was given", async () => {
    const html = await renderConfirmation(customerCta, false)

    expect(html).toContain(`href="${customerCta.href}"`)
  })
})

const contractCopies = [
  ["en-US", englishCopy],
  ["pl-PL", polishCopy],
] as const

const renderContract = (locale: (typeof contractCopies)[number][0], messages: typeof englishCopy, plainText = true): Promise<string> =>
  render(
    <OrderConfirmation
      accountCta={customerCta}
      currency="PLN"
      details={details}
      inlineImageSources={new Map()}
      items={items}
      legalLinks={legalLinks}
      locale={locale}
      messages={messages}
      discountTotal={0}
      orderNumber={ORDER_NUMBER}
      seller={TEST_SELLER_DETAILS}
      shippingTotal={1900}
      subtotal={62_700}
      taxBasisPoints={STANDARD_VAT_BASIS_POINTS}
      taxTotal={12_080}
      total={64_600}
    />,
    plainText ? { plainText: true } : { plainText: false },
  )

const translate = (locale: (typeof contractCopies)[number][0], messages: typeof englishCopy) =>
  createTranslator({ locale, messages: { emails: { "order-confirmation": messages } }, namespace: ORDER_CONFIRMATION_NAMESPACE })

describe("OrderConfirmation as the confirmation of the contract", () => {
  it.each([
    ["en-US", englishCopy, "Poland"],
    ["pl-PL", polishCopy, "Polska"],
  ] as const)("names the stored seller in %s with the legal name, address, NIP, e-mail and phone", async (locale, messages, country) => {
    const text = await renderContract(locale, messages)

    expect(text).toContain(["Pracownia Testowa Anna Nowak", "ul. Floriańska 1", "31-001 Kraków", country].join(" "))
    expect(text).toContain(`${messages.seller.taxIdLabel}: ${TEST_SELLER_DETAILS.nip}`)
    expect(text).toContain(`${messages.seller.emailLabel}: ${TEST_SELLER_DETAILS.email}`)
    expect(text).toContain(`${messages.seller.phoneLabel}: ${TEST_SELLER_DETAILS.phone}`)
  })

  it.each(contractCopies)(
    "states in %s the 14-day right of withdrawal, how to use it, the return cost and the refund",
    async (locale, messages) => {
      const text = await renderContract(locale, messages)
      const t = translate(locale, messages)

      expect(text).toContain(messages.contract.body)
      expect(text).toContain(messages.withdrawal.period)
      expect(text).toContain(t("withdrawal.how", { email: TEST_SELLER_DETAILS.email }))
      expect(text).toContain(messages.withdrawal.returnShipping)
      expect(text).toContain(messages.withdrawal.refund)
      expect(text).toContain(messages.withdrawal.exception)
    },
  )

  it.each(contractCopies)("explains in %s how to make a complaint and when it counts as accepted", async (locale, messages) => {
    const text = await renderContract(locale, messages)
    const t = translate(locale, messages)

    expect(text).toContain(messages.complaints.liability)
    expect(text).toContain(t("complaints.how", { email: TEST_SELLER_DETAILS.email }))
  })

  it.each(contractCopies)(
    "names in %s the consumer ombudsman, the Trade Inspection and consumer organisations as out-of-court routes, and where to find them",
    async (locale, messages) => {
      const text = await renderContract(locale, messages)

      expect(text).toContain(messages.complaints.outOfCourt)
      expect(messages.complaints.outOfCourt).toContain("rzecznik")
      expect(messages.complaints.outOfCourt).toContain("Wojewódzki")
      expect(messages.complaints.outOfCourt).toContain("Federacja Konsumentów")
      expect(messages.complaints.outOfCourt).toContain("uokik.gov.pl")
    },
  )

  it("names the withdrawal and complaint routes with the seller's e-mail address", () => {
    for (const [locale, messages] of contractCopies) {
      const t = translate(locale, messages)

      expect(t("withdrawal.how", { email: TEST_SELLER_DETAILS.email })).toContain(TEST_SELLER_DETAILS.email)
      expect(t("complaints.how", { email: TEST_SELLER_DETAILS.email })).toContain(TEST_SELLER_DETAILS.email)
    }
  })

  it.each(contractCopies)("links in %s the online withdrawal form for the order, named after the function", async (locale, messages) => {
    const text = await renderContract(locale, messages)

    expect(text).toContain(`${messages.withdrawal.online} ${legalLinks.withdrawal}`)
  })

  it("links the terms of service, the returns page and the privacy policy it was given", async () => {
    const html = await renderContract("en-US", englishCopy, false)

    expect(html).toContain(`href="${legalLinks.termsOfService}"`)
    expect(html).toContain(`href="${legalLinks.exchangesAndReturns}"`)
    expect(html).toContain(`href="${legalLinks.privacyPolicy}"`)
  })

  it("labels each legal link with the page it opens", async () => {
    const text = await renderContract("pl-PL", polishCopy)

    expect(text).toContain(`${polishCopy.documents.termsOfService} ${legalLinks.termsOfService}`)
    expect(text).toContain(`${polishCopy.documents.exchangesAndReturns} ${legalLinks.exchangesAndReturns}`)
    expect(text).toContain(`${polishCopy.documents.privacyPolicy} ${legalLinks.privacyPolicy}`)
  })

  it("lets the customer write to or call the seller straight from the email", async () => {
    const html = await renderContract("en-US", englishCopy, false)

    expect(html).toContain(`href="mailto:${TEST_SELLER_DETAILS.email}"`)
    expect(html).toContain('href="tel:+48600100200"')
  })
})
