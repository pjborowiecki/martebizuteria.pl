import { describe, expect, it } from "vite-plus/test"

import { EMAIL_PREVIEWS, type EmailPreviewSlug, isEmailPreviewSlug, renderEmailPreview } from "~/src/integrations/resend/email-previews"

import { formatPrice } from "~/src/modules/_core/utils/currency"

import accountDeletedCopy from "~/messages/en-US/emails.account-deleted.json"
import changeEmailCopy from "~/messages/en-US/emails.change-email.json"
import newsletterAlreadySubscribedCopy from "~/messages/en-US/emails.newsletter-already-subscribed.json"
import orderCancelledCopy from "~/messages/en-US/emails.order-cancelled.json"
import orderConfirmationCopy from "~/messages/en-US/emails.order-confirmation.json"
import orderRefundedCopy from "~/messages/en-US/emails.order-refunded.json"
import orderShippedCopy from "~/messages/en-US/emails.order-shipped.json"
import paymentFailedCopy from "~/messages/en-US/emails.payment-failed.json"
import resetPasswordCopy from "~/messages/en-US/emails.reset-password.json"
import verifyEmailCopy from "~/messages/en-US/emails.verify-email.json"
import polishOrderConfirmationCopy from "~/messages/pl-PL/emails.order-confirmation.json"
import polishPaymentFailedCopy from "~/messages/pl-PL/emails.payment-failed.json"
import polishVerifyEmailCopy from "~/messages/pl-PL/emails.verify-email.json"

const text = (slug: EmailPreviewSlug, locale: "en-US" | "pl-PL" = "en-US"): Promise<string> => renderEmailPreview(slug, locale, true)

describe("isEmailPreviewSlug", () => {
  it("accepts every slug the catalogue exposes", () => {
    expect(Object.keys(EMAIL_PREVIEWS).every((slug) => isEmailPreviewSlug(slug))).toBe(true)
  })

  it("rejects a slug that has no preview", () => {
    expect(isEmailPreviewSlug("order-delivered")).toBe(false)
    expect(isEmailPreviewSlug("")).toBe(false)
  })
})

describe("EMAIL_PREVIEWS", () => {
  it("labels every transactional email the atelier sends", () => {
    expect(Object.entries(EMAIL_PREVIEWS).map(([slug, preview]) => [slug, preview.label])).toStrictEqual([
      ["account-deleted", "Account deleted"],
      ["change-email", "Change email"],
      ["newsletter-already-subscribed", "Newsletter already subscribed"],
      ["order-cancelled", "Order cancelled"],
      ["order-confirmation", "Order confirmation"],
      ["order-refunded", "Order refunded"],
      ["order-shipped", "Order shipped"],
      ["payment-failed", "Payment failed"],
      ["reset-password", "Reset password"],
      ["verify-email", "Verify email"],
    ])
  })
})

describe("renderEmailPreview", () => {
  it("renders the verification email with the English copy", async () => {
    const preview = await text("verify-email")

    expect(preview).toContain(verifyEmailCopy.heading.toUpperCase())
    expect(preview).toContain(verifyEmailCopy.cta)
  })

  it("greets the preview recipient by the sample name", async () => {
    await expect(text("verify-email")).resolves.toContain("Dear Jane Doe,")
  })

  it("renders the same email in Polish when Polish is asked for", async () => {
    const preview = await text("verify-email", "pl-PL")

    expect(preview).toContain(polishVerifyEmailCopy.heading.toUpperCase())
    expect(preview).not.toContain(verifyEmailCopy.cta)
  })

  it("returns markup rather than plain text when plain text is off", async () => {
    const preview = await renderEmailPreview("verify-email", "en-US", false)

    expect(preview).toContain("<html")
    expect(preview).toContain("token=12345")
  })

  it("keeps the verification link out of the plain text version only as a bare url", async () => {
    await expect(text("verify-email")).resolves.toContain("https://martebizuteria.pl/en-US/auth/verify-email?token=12345")
  })

  it("renders the account deleted email", async () => {
    const preview = await text("account-deleted")

    expect(preview).toContain(accountDeletedCopy.heading.toUpperCase())
    expect(preview).toContain("https://martebizuteria.pl/en-US")
  })

  it("renders the change email notice", async () => {
    await expect(text("change-email")).resolves.toContain(changeEmailCopy.highlightTitle)
  })

  it("renders the notice for an address already on the newsletter", async () => {
    const preview = await text("newsletter-already-subscribed")

    expect(preview).toContain(newsletterAlreadySubscribedCopy.heading.toUpperCase())
    expect(preview).toContain("https://martebizuteria.pl/en-US")
  })

  it("renders the password reset email", async () => {
    const preview = await text("reset-password")

    expect(preview).toContain(resetPasswordCopy.cta)
    expect(preview).toContain("auth/reset-password?token=12345")
  })

  it("lists the sample basket on the order confirmation", async () => {
    const preview = await text("order-confirmation")

    expect(preview).toContain("Bransoletka Aurora")
    expect(preview).toContain("Kolczyki Luna")
    expect(preview).toContain(orderConfirmationCopy.totalLabel)
  })

  it("previews the delivery promise and the contract information in the language asked for", async () => {
    const preview = await text("order-confirmation", "pl-PL")

    expect(preview).toContain(
      `${polishOrderConfirmationCopy.fulfillmentTimeLabel}\n\n${polishOrderConfirmationCopy.fulfillmentTime.fallback}`,
    )
    expect(preview).toContain(polishOrderConfirmationCopy.fulfillmentTime.note)
    expect(preview).toContain(polishOrderConfirmationCopy.estimatedDelivery.courier)
    expect(preview).toContain(polishOrderConfirmationCopy.withdrawal.period)
    expect(preview).toContain(`${polishOrderConfirmationCopy.documents.termsOfService} http://localhost:3000/terms-of-service`)
  })

  it("invites the guest buyer to create an account", async () => {
    await expect(text("order-confirmation")).resolves.toContain("Załóż konto i śledź zamówienie")
  })

  it("shows the shipping details on the shipped email", async () => {
    const preview = await text("order-shipped")

    expect(preview).toContain(orderShippedCopy.heading.toUpperCase())
    expect(preview).toContain("ul. Mokotowska 12/4")
  })

  it("points the returning buyer at their own order", async () => {
    await expect(text("order-shipped")).resolves.toContain("Zobacz zamówienie")
  })

  it("previews the cancellation with the refund it issued", async () => {
    const preview = await text("order-cancelled")

    expect(preview).toContain(orderCancelledCopy.heading.toUpperCase())
    expect(preview).toContain(`${orderCancelledCopy.refundLabel}\n\n${formatPrice(64_600, "PLN", "en-US")}`)
    expect(preview).toContain(orderCancelledCopy.refundNote)
  })

  it("previews a partial refund against the order total", async () => {
    const preview = await text("order-refunded")

    expect(preview).toContain(orderRefundedCopy.messagePartial)
    expect(preview).toContain(`${orderRefundedCopy.refundLabel}\n\n${formatPrice(18_900, "PLN", "en-US")}`)
    expect(preview).toContain(`${orderRefundedCopy.orderTotalLabel}\n\n${formatPrice(64_600, "PLN", "en-US")}`)
  })

  it("previews the failed payment with the basket and a way back to the shop in the language asked for", async () => {
    const english = await text("payment-failed")
    const polish = await text("payment-failed", "pl-PL")

    expect(english).toContain("Bransoletka Aurora")
    expect(english).toContain(`${paymentFailedCopy.shopCta} http://localhost:3000/en-US/products`)
    expect(polish).toContain(polishPaymentFailedCopy.heading.toUpperCase())
    expect(polish).toContain("http://localhost:3000/pl-PL/products")
  })
})
