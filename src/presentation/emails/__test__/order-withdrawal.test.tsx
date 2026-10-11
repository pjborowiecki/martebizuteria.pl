import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"

import { BUSINESS } from "~/src/presentation/branding/business"

import englishCopy from "~/messages/en-US/emails.order-withdrawal.json"
import polishCopy from "~/messages/pl-PL/emails.order-withdrawal.json"
import { OrderWithdrawalNotice, OrderWithdrawalReceived } from "~/src/presentation/emails/order-withdrawal"

const ORDER_NUMBER = "MRT-2026-00042"

const ADMIN_ORDER_URL = "https://martebizuteria.pl/admin/orders/order-1"

const statement: OrderWithdrawal["statement"] = {
  consumerName: "Anna Kowalska",
  email: "anna@example.com",
  items: "Kolczyki Luna — Srebro × 2\nNaszyjnik Lapis × 1",
  reason: "The size does not fit.",
  scope: "items",
  submittedAt: new Date("2026-10-10T12:30:00.000Z"),
}

const wholeOrder: OrderWithdrawal["statement"] = { ...statement, items: undefined, reason: undefined, scope: "order" }

const renderReceived = (withdrawal: OrderWithdrawal["statement"], locale: "en-US" | "pl-PL" = "en-US"): Promise<string> =>
  render(
    <OrderWithdrawalReceived
      locale={locale}
      messages={locale === "en-US" ? englishCopy : polishCopy}
      orderNumber={ORDER_NUMBER}
      statement={withdrawal}
    />,
    { plainText: true },
  )

const renderNotice = (plainText: boolean): Promise<string> =>
  render(
    <OrderWithdrawalNotice
      adminOrderUrl={ADMIN_ORDER_URL}
      locale="pl-PL"
      messages={polishCopy}
      orderNumber={ORDER_NUMBER}
      statement={statement}
    />,
    plainText ? { plainText: true } : { plainText: false },
  )

describe("OrderWithdrawalReceived", () => {
  it("repeats the content of a partial statement: the products, the name, the address and the reason", async () => {
    const text = await renderReceived(statement)

    expect(text).toContain("I withdraw from the contract of sale for these products of order MRT-2026-00042:")
    expect(text).toContain("Kolczyki Luna — Srebro × 2")
    expect(text).toContain("Naszyjnik Lapis × 1")
    expect(text).toContain("Anna Kowalska")
    expect(text).toContain("anna@example.com")
    expect(text).toContain("The size does not fit.")
  })

  it("dates the statement to the second in Polish time", async () => {
    await expect(renderReceived(statement)).resolves.toContain("October 10, 2026 at 2:30:00 PM GMT+2")
    await expect(renderReceived(statement, "pl-PL")).resolves.toContain("10 października 2026 14:30:00 CEST")
  })

  it("states a withdrawal from the whole order and that no reason was given", async () => {
    const text = await renderReceived(wholeOrder, "pl-PL")

    expect(text).toContain("Odstępuję od umowy sprzedaży całego zamówienia MRT-2026-00042.")
    expect(text).toContain(polishCopy.statement.noReason)
  })

  it("tells the customer where to send the products back and how the refund works", async () => {
    const text = await renderReceived(statement)

    expect(text).toContain(englishCopy.received.returnBody)
    expect(text).toContain(`${BUSINESS.LEGAL_NAME} ${BUSINESS.STREET} ${BUSINESS.POSTAL_CODE} ${BUSINESS.CITY} Poland`)
    expect(text).toContain(englishCopy.received.refundBody)
  })
})

describe("OrderWithdrawalNotice", () => {
  it("gives the shop the statement and the order number", async () => {
    const text = await renderNotice(true)

    expect(text).toContain("Klient odstąpił od umowy dla zamówienia MRT-2026-00042")
    expect(text).toContain("Odstępuję od umowy sprzedaży tych produktów z zamówienia MRT-2026-00042:")
    expect(text).toContain("The size does not fit.")
  })

  it("links the order in the admin", async () => {
    await expect(renderNotice(false)).resolves.toContain(`href="${ADMIN_ORDER_URL}"`)
  })
})
