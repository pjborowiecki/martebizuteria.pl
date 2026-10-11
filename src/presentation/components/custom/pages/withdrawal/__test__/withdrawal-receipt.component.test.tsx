import { type ReactNode } from "react"

import { cleanup, renderHook, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"
import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { WithdrawalSubmitted, useDescribeWithdrawalReceipt } from "~/src/presentation/components/custom/pages/withdrawal/withdrawal-receipt"

const ShopLocale = ({ children }: Readonly<{ children: ReactNode }>) => (
  <IntlProvider locale={TEST_LOCALE} messages={TEST_MESSAGES} timeZone={I18N.DEFAULT_TIMEZONE}>
    {children}
  </IntlProvider>
)

afterEach(cleanup)

describe("WithdrawalSubmitted", () => {
  it("tells the guest where the acknowledgement goes without saying whether an order matched, and how to reach the shop", () => {
    renderWithProviders(<WithdrawalSubmitted />)

    expect(screen.getByRole("heading", { name: "Thank you for your statement" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(
      "If no confirmation arrives within a few minutes, check the order number and the email address in your order confirmation and send the form again, or write to us at kontakt@martebizuteria.pl.",
    )
  })
})

describe("useDescribeWithdrawalReceipt", () => {
  it("tells the customer the statement is recorded even when the confirmation email failed, and how to get it", () => {
    const describeReceipt = renderHook(useDescribeWithdrawalReceipt, { wrapper: ShopLocale }).result.current

    expect(describeReceipt({ acknowledged: false, email: "anna@example.com", submittedAt: new Date("2026-10-10T12:30:00.000Z") })).toBe(
      "We recorded it on October 10, 2026 at 2:30 PM, but could not email the confirmation to anna@example.com. Please keep this page, or write to us at kontakt@martebizuteria.pl and we will send it again.",
    )
  })
})
