import { type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import changeEmailPolish from "~/messages/pl-PL/emails.change-email.json"

interface SentEmail {
  readonly react: ReactElement<Record<string, unknown>>
  readonly revealsAccountExistence?: boolean
  readonly subject: string
  readonly to: string
}

const stubs = vi.hoisted(() => ({
  getCurrentLocale: vi.fn<() => string>(),
  recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string }) => void>(),
  sendEmail: vi.fn<(input: SentEmail) => Promise<string | undefined>>(),
}))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))

vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: stubs.getCurrentLocale }))

vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordEmailFailedAudit: stubs.recordEmailFailedAudit }))

vi.mock("~/src/presentation/emails/change-email", () => ({
  CHANGE_EMAIL_NAMESPACE: "emails.change-email",
  ChangeEmail: () => null,
}))

const { sendChangeEmailConfirmationEmail } = await import("~/src/modules/account/use-cases/send-change-email-confirmation-email.server")

const LOCALE = "pl-PL"

const user = { email: "shopper@marte.test", name: "Ada" }

const sentEmail = (): SentEmail | undefined => stubs.sendEmail.mock.calls[0]?.[0]

beforeEach(() => {
  vi.resetAllMocks()
  stubs.getCurrentLocale.mockReturnValue(LOCALE)
  stubs.sendEmail.mockResolvedValue(undefined)
})

describe("account emails", () => {
  it("sends a change-email confirmation", async () => {
    await sendChangeEmailConfirmationEmail({ url: "https://marte.test/change", user })

    expect(sentEmail()?.subject).toBe(changeEmailPolish.subject)
  })
})
