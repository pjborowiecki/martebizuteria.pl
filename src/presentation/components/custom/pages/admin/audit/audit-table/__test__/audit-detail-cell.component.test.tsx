import { cleanup, render } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"

import { AuditDetailCell } from "~/src/presentation/components/custom/pages/admin/audit/audit-table/audit-detail-cell"

import polishAdminCopy from "~/messages/pl-PL/pages.admin.json"

const renderEnglish = (detail: AuditLog["detail"] | undefined): HTMLElement =>
  renderWithProviders(<AuditDetailCell detail={detail} />).container

const renderPolish = (detail: AuditLog["detail"]): HTMLElement =>
  render(
    <IntlProvider locale="pl-PL" messages={{ pages: { admin: polishAdminCopy } }} timeZone={I18N.DEFAULT_TIMEZONE}>
      <AuditDetailCell detail={detail} />
    </IntlProvider>,
  ).container

const ORDER_CONFIRMATION: AuditLog["detail"] = { emailKind: "order-confirmation", kind: "email", recipient: "delivered@resend.dev" }

afterEach(cleanup)

describe("AuditDetailCell for e-mails", () => {
  it("names the e-mail in the shop language and keeps its recipient", () => {
    expect(renderPolish(ORDER_CONFIRMATION)).toHaveTextContent("Potwierdzenie zamówienia → delivered@resend.dev")
    expect(renderEnglish(ORDER_CONFIRMATION)).toHaveTextContent("Order confirmation → delivered@resend.dev")
  })

  it("names the shop's own notice of a new order", () => {
    expect(renderPolish({ emailKind: "new-order", kind: "email", recipient: "kontakt@marte.test" })).toHaveTextContent(
      "Powiadomienie o nowym zamówieniu → kontakt@marte.test",
    )
  })

  it("adds the reason a delivery failed after the e-mail", () => {
    expect(renderPolish({ emailKind: "order-shipped", failure: "Domain not verified", kind: "email" })).toHaveTextContent(
      "Informacja o wysyłce zamówienia — Domain not verified",
    )
  })

  it("explains a refusal at the daily limit in the shop language", () => {
    expect(renderPolish({ dailyLimit: 50, emailKind: "newsletter-subscription", kind: "email" })).toHaveTextContent(
      "E-mail w sprawie subskrypcji newslettera — sklep osiągnął dzienny limit 50 e-maili wysyłanych na prośbę odwiedzających",
    )
  })
})

describe("AuditDetailCell for messages", () => {
  it.each([
    [1, "1 produkt w koszyku"],
    [3, "3 produkty w koszyku"],
    [5, "5 produktów w koszyku"],
  ])("counts %i items in an abandoned cart", (count, text) => {
    expect(renderPolish({ kind: "message", message: "cartItemCount", values: { count } })).toHaveTextContent(text)
  })

  it.each([
    [1, "1 potwierdzony subskrybent"],
    [4, "4 potwierdzonych subskrybentów"],
  ])("counts %i newsletter recipients", (count, text) => {
    expect(renderPolish({ kind: "message", message: "recipientCount", values: { count } })).toHaveTextContent(text)
  })

  it("explains why an account was kept and adds the Stripe error", () => {
    expect(
      renderPolish({ kind: "message", message: "stripeCustomerKept", values: { error: "Error: stripe is unreachable" } }),
    ).toHaveTextContent("Nie udało się usunąć klienta w Stripe, więc konto zostało zachowane — Error: stripe is unreachable")
  })
})

describe("AuditDetailCell for coded values", () => {
  it("formats an amount as money in the shop currency", () => {
    const amount: AuditLog["detail"] = { kind: "values", values: [{ field: "amount", value: 1500 }] }

    expect(renderPolish(amount)).toHaveTextContent("15,00 zł")
    expect(renderEnglish(amount)).toHaveTextContent("PLN 15.00")
  })

  it("names the reason and status of a dispute", () => {
    expect(
      renderPolish({
        kind: "values",
        values: [
          { field: "disputeReason", value: "fraudulent" },
          { field: "disputeStatus", value: "needs_response" },
        ],
      }),
    ).toHaveTextContent("Podejrzenie oszustwa — Wymaga odpowiedzi")
  })

  it("names a role", () => {
    expect(renderPolish({ kind: "values", values: [{ field: "role", value: "customer" }] })).toHaveTextContent("Klient")
  })

  it("keeps a code the shop has no name for", () => {
    expect(renderPolish({ kind: "values", values: [{ field: "role", value: "auditor" }] })).toHaveTextContent("auditor")
  })
})

describe("AuditDetailCell for text", () => {
  it("shows text as the row stored it", () => {
    expect(renderPolish({ kind: "text", text: "/products/silver-ring" })).toHaveTextContent("/products/silver-ring")
  })

  it("dashes out a missing detail", () => {
    expect(renderEnglish(undefined)).toHaveTextContent("—")
  })
})
