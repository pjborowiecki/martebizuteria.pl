import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.order-delivered.json"
import polishCopy from "~/messages/pl-PL/emails.order-delivered.json"
import { ORDER_DELIVERED_NAMESPACE, OrderDelivered } from "~/src/presentation/emails/order-delivered"

const ORDER_NUMBER = "MRT-2026-00042"

const links = {
  care: "https://martebizuteria.pl/faq",
  exchangesAndReturns: "https://martebizuteria.pl/exchanges-and-returns",
  withdrawal: `https://martebizuteria.pl/withdraw-from-contract?order=${ORDER_NUMBER}`,
}

const customerCta = { href: "https://martebizuteria.pl/account/orders/abc", isGuest: false, label: englishCopy.viewOrderCta }

const renderDelivered = (messages = englishCopy): Promise<string> =>
  render(
    <OrderDelivered
      accountCta={customerCta}
      links={links}
      locale={messages === englishCopy ? "en-US" : "pl-PL"}
      messages={messages}
      orderNumber={ORDER_NUMBER}
    />,
    { plainText: true },
  )

describe("OrderDelivered", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(ORDER_DELIVERED_NAMESPACE).toBe("emails.order-delivered")
  })

  it("thanks the customer and hopes they love the handcrafted piece", async () => {
    const text = await renderDelivered()

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.message)
    expect(text).toContain(englishCopy.messageSecondary)
    expect(text).toContain(ORDER_NUMBER)
  })

  it("gives every care tip and links to more on the shop's FAQ", async () => {
    const text = await renderDelivered()

    for (const tip of Object.values(englishCopy.care.tips)) {
      expect(text).toContain(tip)
    }
    expect(text).toContain(`${englishCopy.care.more} ${links.care}`)
  })

  it("explains the right of withdrawal and its exception for made-to-order pieces, with links to the form for this order and to the returns rules", async () => {
    const text = await renderDelivered()

    expect(text).toContain(englishCopy.returns.period)
    expect(text).toContain(englishCopy.returns.exception)
    expect(text).toContain(`${englishCopy.returns.withdrawal} ${links.withdrawal}`)
    expect(text).toContain(`${englishCopy.returns.exchangesAndReturns} ${links.exchangesAndReturns}`)
  })

  it("says how to reach the shop and links the customer's order", async () => {
    const text = await renderDelivered()

    expect(text).toContain("kontakt@martebizuteria.pl")
    expect(text).toContain("+48 663 150 820")
    expect(text).toContain(`${customerCta.label} ${customerCta.href}`)
  })

  it("speaks Polish to a Polish order", async () => {
    const text = await renderDelivered(polishCopy)

    expect(text).toContain(polishCopy.heading.toUpperCase())
    expect(text).toContain(polishCopy.care.tips.gentle)
    expect(text).toContain(polishCopy.returns.exception)
    expect(text).toContain(polishCopy.signoff)
  })
})
