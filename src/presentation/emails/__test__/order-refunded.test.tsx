import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import { formatPrice } from "~/src/modules/_core/utils/currency"

import englishCopy from "~/messages/en-US/emails.order-refunded.json"
import polishCopy from "~/messages/pl-PL/emails.order-refunded.json"
import { ORDER_REFUNDED_NAMESPACE, OrderRefunded } from "~/src/presentation/emails/order-refunded"

const ORDER_NUMBER = "MRT-2026-00042"

const ORDER_TOTAL = 39_899

const customerCta = { href: "https://martebizuteria.pl/en-US/account/orders/abc", isGuest: false, label: englishCopy.viewOrderCta }

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderRefunded = ({ fullyRefunded, refundedAmount }: Readonly<{ fullyRefunded: boolean; refundedAmount: number }>): Promise<string> =>
  render(
    <OrderRefunded
      accountCta={customerCta}
      currency="PLN"
      fullyRefunded={fullyRefunded}
      locale="en-US"
      messages={englishCopy}
      orderNumber={ORDER_NUMBER}
      orderTotal={ORDER_TOTAL}
      refundedAmount={refundedAmount}
    />,
    { plainText: true },
  )

describe("OrderRefunded", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(ORDER_REFUNDED_NAMESPACE).toBe("emails.order-refunded")
  })

  it("announces a full refund with the amount refunded and the order total", async () => {
    const text = await renderRefunded({ fullyRefunded: true, refundedAmount: ORDER_TOTAL })

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.messageFull)
    expect(text).not.toContain(englishCopy.messagePartial)
    expect(text).toContain(`${englishCopy.orderLabel}\n\n${ORDER_NUMBER}`)
    expect(text).toContain(`${englishCopy.refundLabel}\n\n${formatPrice(ORDER_TOTAL, "PLN", "en-US")}`)
    expect(text).toContain(`${englishCopy.orderTotalLabel}\n\n${formatPrice(ORDER_TOTAL, "PLN", "en-US")}`)
  })

  it("announces a partial refund with only the amount of that refund", async () => {
    const text = await renderRefunded({ fullyRefunded: false, refundedAmount: 5000 })

    expect(text).toContain(englishCopy.messagePartial)
    expect(text).not.toContain(englishCopy.messageFull)
    expect(text).toContain(`${englishCopy.refundLabel}\n\n${formatPrice(5000, "PLN", "en-US")}`)
  })

  it("tells the customer where the money goes and offers help", async () => {
    const text = await renderRefunded({ fullyRefunded: true, refundedAmount: ORDER_TOTAL })

    expect(text).toContain(englishCopy.refundNote)
    expect(text).toContain(englishCopy.closingNote)
    expect(text).toContain(`${englishCopy.viewOrderCta} ${customerCta.href}`)
  })

  it("renders Polish copy with the Polish labels", async () => {
    const html = await render(
      <OrderRefunded
        accountCta={{ href: customerCta.href, isGuest: false, label: polishCopy.viewOrderCta }}
        currency="PLN"
        fullyRefunded
        locale="pl-PL"
        messages={polishCopy}
        orderNumber={ORDER_NUMBER}
        orderTotal={ORDER_TOTAL}
        refundedAmount={ORDER_TOTAL}
      />,
    )

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(asHtmlText(polishCopy.heading))
    expect(html).toContain(asHtmlText(polishCopy.messageFull))
    expect(html).toContain(formatPrice(ORDER_TOTAL, "PLN", "pl-PL"))
  })
})
