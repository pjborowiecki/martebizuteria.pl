import { type ComponentProps } from "react"

import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import { formatPrice } from "~/src/modules/_core/utils/currency"

import englishCopy from "~/messages/en-US/emails.new-order.json"
import polishCopy from "~/messages/pl-PL/emails.new-order.json"
import { NEW_ORDER_NAMESPACE, NewOrder, type NewOrderDetails } from "~/src/presentation/emails/new-order"

const ORDER_NUMBER = "MRT-2026-00042"

const ADMIN_ORDER_URL = "https://martebizuteria.pl/admin/orders/order-1"

const ORDER_TOTAL = 64_600

const details: NewOrderDetails = {
  companyInvoice: undefined,
  customer: "Anna Kowalska\nanna@example.com\n+48 600 123 456",
  customerNote: undefined,
  deliveryMethod: "Kurier InPost",
  destination: { address: "ul. Mokotowska 12/4\n00-640 Warszawa, Polska", kind: "address" },
}

const aurora = {
  id: "item-aurora",
  quantity: 1,
  sku: "MRT-0101",
  title: "Bransoletka Aurora",
  totalMinorUnits: 24_900,
  unitPriceMinorUnits: 24_900,
  variantTitle: "Złoto",
}

const luna = {
  id: "item-luna",
  quantity: 2,
  sku: undefined,
  title: "Kolczyki Luna",
  totalMinorUnits: 37_800,
  unitPriceMinorUnits: 18_900,
  variantTitle: undefined,
}

const renderNewOrder = (overrides: Partial<ComponentProps<typeof NewOrder>> = {}, plainText = true): Promise<string> =>
  render(
    <NewOrder
      adminOrderUrl={ADMIN_ORDER_URL}
      currency="PLN"
      details={details}
      items={[aurora, luna]}
      locale="en-US"
      messages={englishCopy}
      orderNumber={ORDER_NUMBER}
      total={ORDER_TOTAL}
      {...overrides}
    />,
    plainText ? { plainText: true } : { plainText: false },
  )

describe("NewOrder", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(NEW_ORDER_NAMESPACE).toBe("emails.new-order")
  })

  it("tells the shop a new order arrived under its human readable number", async () => {
    const text = await renderNewOrder()

    expect(text).toContain(englishCopy.heading.toUpperCase())
    expect(text).toContain(englishCopy.message)
    expect(text).toContain(`${englishCopy.orderLabel}\n\n${ORDER_NUMBER}`)
  })

  it("lists every ordered piece with its quantity, unit price and line total", async () => {
    const text = await renderNewOrder()

    expect(text).toContain(`Bransoletka Aurora\n\nZłoto · ${englishCopy.skuLabel}: MRT-0101\n\n1 × ${formatPrice(24_900, "PLN", "en-US")}`)
    expect(text).toContain(`Kolczyki Luna\n\n2 × ${formatPrice(18_900, "PLN", "en-US")} — ${formatPrice(37_800, "PLN", "en-US")}`)
  })

  it("names a piece's SKU when it has no variant of its own", async () => {
    const text = await renderNewOrder({ items: [{ ...aurora, variantTitle: undefined }] })

    expect(text).toContain(`Bransoletka Aurora\n\n${englishCopy.skuLabel}: MRT-0101\n\n`)
  })

  it("names a piece's variant when its SKU is unknown", async () => {
    const text = await renderNewOrder({ items: [{ ...aurora, sku: undefined }] })

    expect(text).toContain("Bransoletka Aurora\n\nZłoto\n\n")
    expect(text).not.toContain(englishCopy.skuLabel)
  })

  it("states the total the customer paid with delivery", async () => {
    await expect(renderNewOrder()).resolves.toContain(`${englishCopy.totalLabel}: ${formatPrice(ORDER_TOTAL, "PLN", "en-US")}`)
  })

  it("shows how to reach the customer and where the order goes", async () => {
    const text = await renderNewOrder()
    const html = await renderNewOrder({}, false)

    expect(text).toContain(`${englishCopy.customerLabel}\n\nAnna Kowalska anna@example.com +48 600 123 456`)
    expect(text).toContain(`${englishCopy.deliveryMethodLabel}\n\n${details.deliveryMethod}`)
    expect(text).toContain(`${englishCopy.shippingAddressLabel}\n\nul. Mokotowska 12/4 00-640 Warszawa, Polska`)
    expect(html).toContain(details.customer)
    expect(html).toContain("ul. Mokotowska 12/4\n00-640 Warszawa, Polska")
  })

  it("sends a locker order to the locker rather than to the customer's address", async () => {
    const text = await renderNewOrder({
      details: {
        ...details,
        deliveryMethod: "Paczkomat InPost",
        destination: { kind: "locker", locker: "WAW01M\nMarszałkowska 1\n00-001 Warszawa", recipient: undefined },
      },
    })

    expect(text).toContain(`${englishCopy.lockerLabel}\n\nWAW01M Marszałkowska 1 00-001 Warszawa`)
    expect(text).not.toContain(englishCopy.shippingAddressLabel)
  })

  it("shows the customer's note only when they left one", async () => {
    await expect(renderNewOrder()).resolves.not.toContain(englishCopy.customerNoteLabel)

    const text = await renderNewOrder({ details: { ...details, customerNote: "Please gift-wrap the bracelet." } })

    expect(text).toContain(`${englishCopy.customerNoteLabel}\n\nPlease gift-wrap the bracelet.`)
  })

  it("shows the company to invoice only when the customer asked for an invoice", async () => {
    await expect(renderNewOrder()).resolves.not.toContain(englishCopy.companyInvoiceLabel)

    const companyInvoice = "Pracownia Złotnicza sp. z o.o.\nNIP 5260001246\nul. Marszałkowska 1\n00-001 Warszawa, Polska"
    const text = await renderNewOrder({ details: { ...details, companyInvoice } })
    const html = await renderNewOrder({ details: { ...details, companyInvoice } }, false)

    expect(text).toContain(
      `${englishCopy.companyInvoiceLabel}\n\nPracownia Złotnicza sp. z o.o. NIP 5260001246 ul. Marszałkowska 1 00-001 Warszawa, Polska`,
    )
    expect(html).toContain(companyInvoice)
  })

  it("links the button to the order in the admin", async () => {
    const html = await renderNewOrder({}, false)

    expect(html).toContain(`href="${ADMIN_ORDER_URL}"`)
    expect(html).toContain(englishCopy.adminCta)
  })

  it("renders Polish copy with the Polish labels and the Polish amounts", async () => {
    const html = await renderNewOrder({ locale: "pl-PL", messages: polishCopy }, false)

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(polishCopy.heading)
    expect(html).toContain(polishCopy.adminCta)
    expect(html).toContain(formatPrice(ORDER_TOTAL, "PLN", "pl-PL"))
  })
})
