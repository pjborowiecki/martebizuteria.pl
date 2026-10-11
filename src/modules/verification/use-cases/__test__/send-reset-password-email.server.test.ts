import { type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import resetPasswordPolish from "~/messages/pl-PL/emails.reset-password.json"

interface SentEmail {
  readonly react: ReactElement<Record<string, unknown>>
  readonly revealsAccountExistence?: boolean
  readonly subject: string
  readonly to: string
}

const stubs = vi.hoisted(() => ({
  admitPublicEmail: vi.fn<(email: { kind: string; to: string }) => Promise<boolean>>(),
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

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {},
}))

vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))

vi.mock(import("~/src/integrations/resend/resend.public-email-limits.server"), async (importOriginal) => ({
  ...(await importOriginal()),
  admitPublicEmail: stubs.admitPublicEmail,
}))

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: stubs.getCurrentLocale }))

vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordEmailFailedAudit: stubs.recordEmailFailedAudit }))

vi.mock("~/src/presentation/emails/reset-password", () => ({
  RESET_PASSWORD_NAMESPACE: "emails.reset-password",
  ResetPassword: () => null,
}))

const { sendResetPasswordEmail } = await import("~/src/modules/verification/use-cases/send-reset-password-email.server")

const LOCALE = "pl-PL"

const user = { email: "shopper@marte.test", name: "Ada" }

const sentEmail = (): SentEmail | undefined => stubs.sendEmail.mock.calls[0]?.[0]

const sentProp = (name: string): unknown => sentEmail()?.react.props[name]

beforeEach(() => {
  vi.resetAllMocks()
  stubs.getCurrentLocale.mockReturnValue(LOCALE)
  stubs.sendEmail.mockResolvedValue(undefined)
  stubs.admitPublicEmail.mockResolvedValue(true)
})

describe("account emails", () => {
  it("sends a reset-password link", async () => {
    await sendResetPasswordEmail({ url: "https://marte.test/reset", user })

    expect(sentEmail()?.subject).toBe(resetPasswordPolish.subject)
    expect(sentProp("resetPasswordUrl")).toBe("https://marte.test/reset")
    expect(stubs.admitPublicEmail).toHaveBeenCalledExactlyOnceWith({ kind: "password-reset", to: user.email })
  })

  it("sends no reset-password link, and answers as if it had, once the limits refuse the email", async () => {
    stubs.admitPublicEmail.mockResolvedValue(false)

    await expect(sendResetPasswordEmail({ url: "https://marte.test/reset", user })).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
  })
})
