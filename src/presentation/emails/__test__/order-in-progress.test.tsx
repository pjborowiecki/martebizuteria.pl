import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.order-in-progress.json"
import polishCopy from "~/messages/pl-PL/emails.order-in-progress.json"
import { ORDER_IN_PROGRESS_NAMESPACE, OrderInProgress, type OrderInProgressDelivery } from "~/src/presentation/emails/order-in-progress"

const ORDER_NUMBER = "MRT-2026-00042"

const customerCta = { href: "https://martebizuteria.pl/account/orders/abc", isGuest: false, label: englishCopy.viewOrderCta }

const renderInProgress = (delivery: OrderInProgressDelivery, messages = englishCopy): Promise<string> =>
  render(
    <OrderInProgress
      accountCta={customerCta}
      delivery={delivery}
      locale={messages === englishCopy ? "en-US" : "pl-PL"}
      messages={messages}
      orderNumber={ORDER_NUMBER}
    />,
    { plainText: true },
  )

describe("OrderInProgress", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(ORDER_IN_PROGRESS_NAMESPACE).toBe("emails.order-in-progress")
  })

  it("says the handmade piece is being prepared and names the order and its delivery", async () => {
    const text = await renderInProgress({ methodName: "Kurier InPost", type: "courier" })

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.message)
    expect(text).toContain(ORDER_NUMBER)
    expect(text).toContain(`${englishCopy.deliveryMethodLabel}\n\nKurier InPost`)
    expect(text).toContain(`${customerCta.label} ${customerCta.href}`)
  })

  it.each([["courier"], ["locker"], ["in_store"]] as const)("tells a %s order what comes next", async (type) => {
    await expect(renderInProgress({ methodName: "Method", type })).resolves.toContain(englishCopy.nextStep[type])
  })

  it("promises a shipping email with a tracking number for a parcel", async () => {
    const text = await renderInProgress({ methodName: "Paczkomat InPost", type: "locker" }, polishCopy)

    expect(text).toContain(polishCopy.nextStep.locker)
    expect(polishCopy.nextStep.locker).toContain("numerem przesyłki")
  })

  it("says the delivery method is unavailable when the order lost it", async () => {
    await expect(renderInProgress({ methodName: undefined, type: "courier" })).resolves.toContain(
      `${englishCopy.deliveryMethodLabel}\n\n${englishCopy.unavailable}`,
    )
  })
})
