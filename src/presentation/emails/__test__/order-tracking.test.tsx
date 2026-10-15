import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import { type OrderTracking } from "~/src/modules/order/order.email.utils"

import englishCopy from "~/messages/en-US/emails.order-tracking.json"
import polishCopy from "~/messages/pl-PL/emails.order-tracking.json"
import { ORDER_TRACKING_NAMESPACE, OrderTrackingUpdate } from "~/src/presentation/emails/order-tracking"

const ORDER_NUMBER = "MRT-2026-00042"

const TRACKING_URL = "https://inpost.pl/sledzenie-przesylek?number=00259007123456789012"

const customerCta = { href: "https://martebizuteria.pl/account/orders/abc", isGuest: false, label: englishCopy.viewOrderCta }

const tracking: OrderTracking = { carrier: "InPost", trackingNumber: "00259007123456789012", trackingUrl: TRACKING_URL }

const renderTracking = (overrides: Partial<OrderTracking> = {}, messages = englishCopy): Promise<string> =>
  render(
    <OrderTrackingUpdate
      accountCta={customerCta}
      locale={messages === englishCopy ? "en-US" : "pl-PL"}
      messages={messages}
      orderNumber={ORDER_NUMBER}
      tracking={{ ...tracking, ...overrides }}
    />,
    { plainText: true },
  )

describe("OrderTrackingUpdate", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(ORDER_TRACKING_NAMESPACE).toBe("emails.order-tracking")
  })

  it("gives the order, the carrier and the tracking number under their labels", async () => {
    const text = await renderTracking()

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(ORDER_NUMBER)
    expect(text).toContain(`${englishCopy.carrierLabel}\n\nInPost`)
    expect(text).toContain(`${englishCopy.trackingNumberLabel}\n\n00259007123456789012`)
  })

  it("links the button to the carrier's tracking page", async () => {
    await expect(renderTracking()).resolves.toContain(`${englishCopy.trackingCta} ${TRACKING_URL}`)
  })

  it("keeps a link to the customer's order beside the tracking button", async () => {
    await expect(renderTracking()).resolves.toContain(`${customerCta.label} ${customerCta.href}`)
  })

  it("falls back to the customer's order when the carrier has no tracking page", async () => {
    await expect(renderTracking({ trackingUrl: undefined })).resolves.toContain(`${englishCopy.viewOrderCta} ${customerCta.href}`)
  })

  it("leaves the carrier out when the delivery has none", async () => {
    await expect(renderTracking({ carrier: undefined })).resolves.not.toContain(englishCopy.carrierLabel)
  })

  it("says the number is unavailable rather than leaving the row empty", async () => {
    await expect(renderTracking({ trackingNumber: undefined })).resolves.toContain(
      `${englishCopy.trackingNumberLabel}\n\n${englishCopy.unavailable}`,
    )
  })

  it("speaks Polish to a Polish order", async () => {
    const text = await renderTracking({}, polishCopy)

    expect(text).toContain(polishCopy.heading.toUpperCase())
    expect(text).toContain(polishCopy.signoff)
  })
})
