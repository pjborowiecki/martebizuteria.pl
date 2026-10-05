import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import { formatPrice } from "~/src/modules/_core/utils/currency"

import englishCopy from "~/messages/en-US/emails.order-cancelled.json"
import polishCopy from "~/messages/pl-PL/emails.order-cancelled.json"
import { ORDER_CANCELLED_NAMESPACE, OrderCancelled } from "~/src/presentation/emails/order-cancelled"

const ORDER_NUMBER = "MRT-2026-00042"

const REFUNDED_AMOUNT = 39_899

const customerCta = { href: "https://martebizuteria.pl/en-US/account/orders/abc", isGuest: false, label: englishCopy.viewOrderCta }

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderCancelled = (refundedAmount: number | undefined, plainText = true): Promise<string> =>
  render(
    <OrderCancelled
      accountCta={customerCta}
      currency="PLN"
      locale="en-US"
      messages={englishCopy}
      orderNumber={ORDER_NUMBER}
      refundedAmount={refundedAmount}
    />,
    plainText ? { plainText: true } : { plainText: false },
  )

describe("OrderCancelled", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(ORDER_CANCELLED_NAMESPACE).toBe("emails.order-cancelled")
  })

  it("tells the customer the order was cancelled under its human readable number", async () => {
    const text = await renderCancelled(REFUNDED_AMOUNT)

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.message)
    expect(text).toContain(`${englishCopy.orderLabel}\n\n${ORDER_NUMBER}`)
    expect(text).toContain(englishCopy.closingNote)
  })

  it("states the amount the cancellation refunded and when it reaches the customer", async () => {
    const text = await renderCancelled(REFUNDED_AMOUNT)

    expect(text).toContain(`${englishCopy.refundLabel}\n\n${formatPrice(REFUNDED_AMOUNT, "PLN", "en-US")}`)
    expect(text).toContain(englishCopy.refundNote)
    expect(text).not.toContain(englishCopy.noPaymentNote)
  })

  it("says there is nothing to refund when no payment was taken", async () => {
    const text = await renderCancelled(undefined)

    expect(text).toContain(englishCopy.noPaymentNote)
    expect(text).not.toContain(englishCopy.refundLabel)
    expect(text).not.toContain(englishCopy.refundNote)
  })

  it("points the button at the order the customer can view", async () => {
    const html = await renderCancelled(REFUNDED_AMOUNT, false)

    expect(html).toContain(`href="${customerCta.href}"`)
    expect(html).toContain(englishCopy.viewOrderCta)
  })

  it("renders Polish copy with the Polish labels and the Polish amount", async () => {
    const html = await render(
      <OrderCancelled
        accountCta={{ href: "https://martebizuteria.pl/auth/sign-up", isGuest: true, label: polishCopy.createAccountCta }}
        currency="PLN"
        locale="pl-PL"
        messages={polishCopy}
        orderNumber={ORDER_NUMBER}
        refundedAmount={REFUNDED_AMOUNT}
      />,
    )

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(asHtmlText(polishCopy.heading))
    expect(html).toContain(formatPrice(REFUNDED_AMOUNT, "PLN", "pl-PL"))
    expect(html).toContain(polishCopy.createAccountCta)
  })
})
