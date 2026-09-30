import { describe, expect, it } from "vite-plus/test"

import { EMAIL_PREVIEWS, type EmailPreviewSlug, isEmailPreviewSlug, renderEmailPreview } from "~/src/integrations/resend/email-previews"

import accountDeletedCopy from "~/messages/en-US/emails.account-deleted.json"
import changeEmailCopy from "~/messages/en-US/emails.change-email.json"
import orderConfirmationCopy from "~/messages/en-US/emails.order-confirmation.json"
import orderShippedCopy from "~/messages/en-US/emails.order-shipped.json"
import resetPasswordCopy from "~/messages/en-US/emails.reset-password.json"
import verifyEmailCopy from "~/messages/en-US/emails.verify-email.json"
import polishVerifyEmailCopy from "~/messages/pl-PL/emails.verify-email.json"

const text = (slug: EmailPreviewSlug, locale: "en-US" | "pl-PL" = "en-US"): Promise<string> => renderEmailPreview(slug, locale, true)

describe("isEmailPreviewSlug", () => {
  it("accepts every slug the catalogue exposes", () => {
    expect(Object.keys(EMAIL_PREVIEWS).every((slug) => isEmailPreviewSlug(slug))).toBe(true)
  })

  it("rejects a slug that has no preview", () => {
    expect(isEmailPreviewSlug("order-cancelled")).toBe(false)
    expect(isEmailPreviewSlug("")).toBe(false)
  })
})

describe("EMAIL_PREVIEWS", () => {
  it("labels every transactional email the atelier sends", () => {
    expect(Object.entries(EMAIL_PREVIEWS).map(([slug, preview]) => [slug, preview.label])).toStrictEqual([
      ["account-deleted", "Account deleted"],
      ["change-email", "Change email"],
      ["order-confirmation", "Order confirmation"],
      ["order-shipped", "Order shipped"],
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
})
