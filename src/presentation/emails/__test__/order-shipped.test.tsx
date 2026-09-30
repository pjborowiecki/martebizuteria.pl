import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.order-shipped.json"
import polishCopy from "~/messages/pl-PL/emails.order-shipped.json"
import { ORDER_SHIPPED_NAMESPACE, OrderShipped, type OrderShippedDetails } from "~/src/presentation/emails/order-shipped"

const ORDER_ID = "a1b2c3d4-0000-0000-0000-000000000000"

const details: OrderShippedDetails = {
  deliveryMethod: "DPD courier",
  estimatedDelivery: englishCopy.deliveryTiming.courier.estimatedDelivery,
  shippingAddress: "Anna Kowalska\nul. Mokotowska 12/4\n00-640 Warszawa",
  trackingNumber: undefined,
  trackingUrl: undefined,
}

const customerCta = { href: "https://martebizuteria.pl/account/orders/abc", isGuest: false, label: englishCopy.viewOrderCta }

const asHtmlText = (copy: string): string => copy.replaceAll("'", "&#x27;")

const renderShipped = (plainText = true): Promise<string> =>
  render(
    <OrderShipped accountCta={customerCta} details={details} locale="en-US" messages={englishCopy} orderId={ORDER_ID} />,
    plainText ? { plainText: true } : { plainText: false },
  )

const TRACKING_URL = "https://inpost.pl/sledzenie-przesylek?number=00259007123456789012"

const renderTracked = (plainText = true): Promise<string> =>
  render(
    <OrderShipped
      accountCta={customerCta}
      details={{ ...details, trackingNumber: "00259007123456789012", trackingUrl: TRACKING_URL }}
      locale="en-US"
      messages={englishCopy}
      orderId={ORDER_ID}
    />,
    plainText ? { plainText: true } : { plainText: false },
  )

describe("OrderShipped", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(ORDER_SHIPPED_NAMESPACE).toBe("emails.order-shipped")
  })

  it("shows the eight character uppercase order reference", async () => {
    const text = await renderShipped()

    expect(text).toContain(englishCopy.orderLabel)
    expect(text).toContain("A1B2C3D4")
    expect(text).not.toContain(ORDER_ID)
  })

  it("lists the delivery method, the address and the estimate under their labels", async () => {
    const text = await renderShipped()

    expect(text).toContain(`${englishCopy.deliveryMethodLabel}\n\n${details.deliveryMethod}`)
    expect(text).toContain(englishCopy.shippingAddressLabel)
    expect(text).toContain("ul. Mokotowska 12/4")
    expect(text).toContain(`${englishCopy.estimatedDeliveryLabel}\n\n2–4 business days after dispatch`)
  })

  it("carries the dispatch message and the closing offer of help", async () => {
    const text = await renderShipped()

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.message)
    expect(text).toContain(englishCopy.messageSecondary)
    expect(text).toContain(englishCopy.closingNote)
  })

  it("has no greeting, because the shipment notice addresses the order", async () => {
    const text = await renderShipped()

    expect(text).not.toContain("Dear")
  })

  it("omits the tracking row when no parcel number was captured", async () => {
    const text = await renderShipped()

    expect(text).not.toContain(englishCopy.trackingNumberLabel)
  })

  it("lists the tracking number once the shipment is registered", async () => {
    const text = await renderTracked()

    expect(text).toContain(`${englishCopy.trackingNumberLabel}\n\n00259007123456789012`)
  })

  it("sends the button to the carrier when a tracking link exists", async () => {
    const html = await renderTracked(false)

    expect(html).toContain(`href="${TRACKING_URL}"`)
    expect(html).toContain(englishCopy.trackingCta)
    expect(html).not.toContain(englishCopy.viewOrderCta)
  })

  it("points the button at the order the shopper can view", async () => {
    const html = await renderShipped(false)

    expect(html).toContain(`href="${customerCta.href}"`)
    expect(html).toContain(englishCopy.viewOrderCta)
    expect(html).not.toContain(englishCopy.createAccountCta)
  })

  it("uses the guest label when the cta says the buyer has no account", async () => {
    const html = await render(
      <OrderShipped
        accountCta={{ href: "https://martebizuteria.pl/auth/sign-up", isGuest: true, label: englishCopy.createAccountCta }}
        details={details}
        locale="en-US"
        messages={englishCopy}
        orderId={ORDER_ID}
      />,
    )

    expect(html).toContain(englishCopy.createAccountCta)
  })

  it("renders Polish copy with the Polish labels", async () => {
    const html = await render(
      <OrderShipped
        accountCta={{ href: customerCta.href, isGuest: false, label: polishCopy.viewOrderCta }}
        details={{ ...details, estimatedDelivery: polishCopy.deliveryTiming.courier.estimatedDelivery }}
        locale="pl-PL"
        messages={polishCopy}
        orderId={ORDER_ID}
      />,
    )

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(asHtmlText(polishCopy.heading))
    expect(html).toContain(asHtmlText(polishCopy.orderLabel))
  })
})
