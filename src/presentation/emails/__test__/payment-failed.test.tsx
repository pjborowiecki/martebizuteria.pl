import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import { formatPrice } from "~/src/modules/_core/utils/currency"

import englishCopy from "~/messages/en-US/emails.payment-failed.json"
import polishCopy from "~/messages/pl-PL/emails.payment-failed.json"
import { PAYMENT_FAILED_NAMESPACE, PaymentFailed } from "~/src/presentation/emails/payment-failed"

const AMOUNT = 39_899

const SHOP_URL = "https://martebizuteria.pl/en-US/products"

const ONYX_URL = "https://martebizuteria.pl/en-US/products/onyx-necklace"

const LAPIS_URL = "https://martebizuteria.pl/en-US/products/lapis-lazuli-necklace"

const items = [
  { productUrl: ONYX_URL, qty: 1, title: "Onyx Necklace" },
  { productUrl: LAPIS_URL, qty: 2, title: "Lapis Lazuli Necklace" },
]

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderFailed = (amount: number | null, plainText = true, currency: string | null = "PLN"): Promise<string> =>
  render(
    <PaymentFailed amount={amount} currency={currency} items={items} locale="en-US" messages={englishCopy} shopUrl={SHOP_URL} />,
    plainText ? { plainText: true } : { plainText: false },
  )

describe("PaymentFailed", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(PAYMENT_FAILED_NAMESPACE).toBe("emails.payment-failed")
  })

  it("tells the customer the payment failed and the order was not placed", async () => {
    const text = await renderFailed(AMOUNT)

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.message)
    expect(text).toContain(englishCopy.messageSecondary)
    expect(text).toContain(englishCopy.closingNote)
  })

  it("lists every piece with its quantity, linked to its product page", async () => {
    const html = await renderFailed(AMOUNT, false)

    expect(html).toContain(`href="${ONYX_URL}"`)
    expect(html).toContain(`href="${LAPIS_URL}"`)
    expect(await renderFailed(AMOUNT)).toContain("× 2")
  })

  it("states the amount that was not paid", async () => {
    const text = await renderFailed(AMOUNT)

    expect(text).toContain(`${englishCopy.amountLabel}\n\n${formatPrice(AMOUNT, "PLN", "en-US")}`)
  })

  it("leaves the amount out when Stripe reported none", async () => {
    const text = await renderFailed(null)

    expect(text).not.toContain(englishCopy.amountLabel)
  })

  it("leaves the amount out when Stripe reported no currency for it", async () => {
    const text = await renderFailed(AMOUNT, true, null)

    expect(text).not.toContain(englishCopy.amountLabel)
  })

  it("formats the lower-case currency Stripe reports", async () => {
    const text = await renderFailed(AMOUNT, true, "pln")

    expect(text).toContain(formatPrice(AMOUNT, "PLN", "en-US"))
  })

  it("sends the button back to the shop", async () => {
    const html = await renderFailed(AMOUNT, false)

    expect(html).toContain(`href="${SHOP_URL}"`)
    expect(html).toContain(englishCopy.shopCta)
  })

  it("renders Polish copy with the Polish labels", async () => {
    const html = await render(
      <PaymentFailed amount={AMOUNT} currency="PLN" items={items} locale="pl-PL" messages={polishCopy} shopUrl={SHOP_URL} />,
    )

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(asHtmlText(polishCopy.heading))
    expect(html).toContain(formatPrice(AMOUNT, "PLN", "pl-PL"))
  })
})
