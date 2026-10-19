import { type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface SentEmail {
  readonly react: ReactElement<Record<string, unknown>>
  readonly revealsAccountExistence?: boolean
  readonly subject: string
  readonly to: string
}

const stubs = vi.hoisted(() => ({
  admitPublicEmail: vi.fn<(email: { kind: string; to: string }) => Promise<boolean>>(),
  buildLocalizedUrl: vi.fn<(base: string, path: string, locale: string) => string>(),
  claimGuestOrdersForUser: vi.fn<(input: { email: string; userId: string }) => Promise<number>>(),
  eraseAccountData: vi.fn<(account: { email: string; id: string }) => Promise<boolean>>(),
  getCurrentLocale: vi.fn<() => string>(),
  isEmailSenderUnavailable: vi.fn<() => Promise<boolean>>(),
  linkSubscriberToUser: vi.fn<(email: string, userId: string) => Promise<void>>(),
  recordAuthLoginAudit: vi.fn(),
  recordAuthPasswordResetAudit: vi.fn(),
  recordCustomerDeletedAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string; metadata?: Record<string, unknown> }) => void>(),
  resolveAuthAuditActor: vi.fn(),
  scheduleAdminCustomersInvalidation: vi.fn(),
  sendEmail: vi.fn<(input: SentEmail) => Promise<string | undefined>>(),
}))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))

vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {},
}))

vi.mock("~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors", () => ({ linkSubscriberToUser: stubs.linkSubscriberToUser }))
vi.mock("~/src/modules/order/use-cases/claim-guest-orders.server", () => ({ claimGuestOrdersForUser: stubs.claimGuestOrdersForUser }))
vi.mock("~/src/modules/user/user.accessors", () => ({ getUserById: vi.fn() }))
vi.mock("~/src/modules/user/user.erasure.server", () => ({ eraseAccountData: stubs.eraseAccountData }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: stubs.scheduleAdminCustomersInvalidation,
}))

vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))
vi.mock("~/src/integrations/resend/resend.availability.server", () => ({ isEmailSenderUnavailable: stubs.isEmailSenderUnavailable }))
vi.mock(import("~/src/integrations/resend/resend.public-email-limits.server"), async (importOriginal) => ({
  ...(await importOriginal()),
  admitPublicEmail: stubs.admitPublicEmail,
}))

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: stubs.getCurrentLocale }))

vi.mock("~/src/lib/seo", () => ({ buildLocalizedUrl: stubs.buildLocalizedUrl }))

vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginAudit: stubs.recordAuthLoginAudit,
  recordAuthPasswordResetAudit: stubs.recordAuthPasswordResetAudit,
  recordCustomerDeletedAudit: stubs.recordCustomerDeletedAudit,
  recordCustomerRegisteredAudit: stubs.recordCustomerRegisteredAudit,
  recordEmailFailedAudit: stubs.recordEmailFailedAudit,
  resolveAuthAuditActor: stubs.resolveAuthAuditActor,
}))

vi.mock("~/src/presentation/emails/account-deleted", () => ({
  ACCOUNT_DELETED_NAMESPACE: "emails.account-deleted",
  AccountDeleted: () => null,
}))

vi.mock("~/src/presentation/emails/change-email", () => ({
  CHANGE_EMAIL_NAMESPACE: "emails.change-email",
  ChangeEmail: () => null,
}))

vi.mock("~/src/presentation/emails/password-changed", () => ({
  PASSWORD_CHANGED_NAMESPACE: "emails.password-changed",
  PasswordChanged: () => null,
}))

vi.mock("~/src/presentation/emails/reset-password", () => ({
  RESET_PASSWORD_NAMESPACE: "emails.reset-password",
  ResetPassword: () => null,
}))

vi.mock("~/src/presentation/emails/verify-email", () => ({
  VERIFY_EMAIL_NAMESPACE: "emails.verify-email",
  VerifyEmail: () => null,
}))

const { handleSelfServiceDeletion } = await import("~/src/integrations/better-auth/auth.hooks.server")

const { sendChangeEmailConfirmationEmail } = await import("~/src/modules/account/use-cases/send-change-email-confirmation-email.server")

const { sendPasswordChangedEmail } = await import("~/src/modules/account/use-cases/send-password-changed-email.server")

const { sendAccountDeletedEmail } = await import("~/src/modules/user/use-cases/send-account-deleted-email.server")

const { sendResetPasswordEmail } = await import("~/src/modules/verification/use-cases/send-reset-password-email.server")

const { sendVerifyEmail } = await import("~/src/modules/verification/use-cases/send-verify-email.server")

const NOW = new Date("2026-01-01T00:00:00.000Z")

const LOCALE = "pl-PL"

const createdUser = {
  createdAt: NOW,
  email: "shopper@marte.test",
  emailVerified: true,
  id: "usr_1",
  name: "Ada",
  updatedAt: NOW,
}

const user = { email: "shopper@marte.test", id: "user-ada", name: "Ada" }

const goodbye = { email: user.email, name: user.name, origin: "http://127.0.0.1:3000" }

const deletionOn = (origin: string): Request => new Request(`${origin}/api/auth/delete-user`, { method: "POST" })

const resetOn = (origin: string): Request => new Request(`${origin}/api/auth/reset-password`, { method: "POST" })

const verifyUrl = (callback?: string): string =>
  callback === undefined
    ? "https://marte.test/api/auth/verify-email?token=tok"
    : `https://marte.test/api/auth/verify-email?token=tok&callbackURL=${encodeURIComponent(callback)}`

const sentEmail = (): SentEmail | undefined => stubs.sendEmail.mock.calls[0]?.[0]

beforeEach(() => {
  vi.resetAllMocks()
  stubs.resolveAuthAuditActor.mockReturnValue("customer-actor")
  stubs.getCurrentLocale.mockReturnValue(LOCALE)
  stubs.sendEmail.mockResolvedValue(undefined)
  stubs.isEmailSenderUnavailable.mockResolvedValue(false)
  stubs.admitPublicEmail.mockResolvedValue(true)
  stubs.buildLocalizedUrl.mockImplementation((_base, path, locale) => (path === "/" ? `/${locale}` : `/${locale}${path}`))
})

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const RESET_URL = "https://marte.test/api/auth/reset-password/secret-reset-token?callbackURL=%2Fen-US%2Fauth%2Freset-password"

const refuseEmails = () => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  stubs.sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)
}

describe("auth email delivery", () => {
  it.each([
    ["reset-password", () => sendResetPasswordEmail({ url: RESET_URL, user })],
    ["verification", () => sendVerifyEmail({ url: verifyUrl(), user })],
    ["change-email", () => sendChangeEmailConfirmationEmail({ url: "https://marte.test/change", user })],
  ])("answers a refused %s email with a retryable EMAIL_DELIVERY_FAILED", async (_kind, send) => {
    refuseEmails()

    await expect(send()).rejects.toMatchObject({ body: { code: "EMAIL_DELIVERY_FAILED" }, statusCode: 503 })
  })

  it("records a refused auth email in the audit log without the link it carried", async () => {
    refuseEmails()

    await expect(sendResetPasswordEmail({ url: RESET_URL, user })).rejects.toThrow()

    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, {
      detail: DOMAIN_NOT_VERIFIED,
      metadata: { emailKind: "reset-password" },
      resourceId: user.id,
    })
    expect(JSON.stringify(stubs.recordEmailFailedAudit.mock.calls)).not.toContain("secret-reset-token")
  })

  it("logs a refused auth email with its kind and recipient", async () => {
    refuseEmails()

    await expect(sendChangeEmailConfirmationEmail({ url: "https://marte.test/change", user })).rejects.toThrow()

    expect(console.error).toHaveBeenCalledWith(`[Auth] Failed to send change-email email to ${user.email}: ${DOMAIN_NOT_VERIFIED}`)
  })

  it.each([
    ["reset-password", () => sendResetPasswordEmail({ url: RESET_URL, user })],
    ["verification", () => sendVerifyEmail({ url: verifyUrl(), user })],
    ["change-email", () => sendChangeEmailConfirmationEmail({ url: "https://marte.test/change", user })],
  ])("keeps the %s email, sent only for some addresses, from marking the sender unavailable", async (_kind, send) => {
    await send()

    expect(sentEmail()?.revealsAccountExistence).toBe(true)
  })

  it("lets a goodbye note, whose sending says nothing about other accounts, mark the sender unavailable", async () => {
    await sendAccountDeletedEmail(goodbye)

    expect(sentEmail()?.revealsAccountExistence).toBeUndefined()
  })

  it("lets a password-changed email, sent only to whoever already used the account's reset link, mark the sender unavailable", async () => {
    await sendPasswordChangedEmail({ request: resetOn("http://localhost:3000"), user })

    expect(sentEmail()?.revealsAccountExistence).toBeUndefined()
  })

  it("records a refused password-changed email instead of throwing", async () => {
    refuseEmails()

    await expect(sendPasswordChangedEmail({ request: resetOn("http://localhost:3000"), user })).resolves.toBeUndefined()

    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, {
      detail: DOMAIN_NOT_VERIFIED,
      metadata: { emailKind: "password-changed" },
      resourceId: user.id,
    })
  })

  it("records nothing when the provider accepts the message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(sendResetPasswordEmail({ url: RESET_URL, user })).resolves.toBeUndefined()

    expect(log).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).not.toHaveBeenCalled()
  })

  it("reports whether the goodbye note went out instead of throwing", async () => {
    await expect(sendAccountDeletedEmail(goodbye)).resolves.toBe(true)

    refuseEmails()

    await expect(sendAccountDeletedEmail(goodbye)).resolves.toBe(false)
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, {
      detail: DOMAIN_NOT_VERIFIED,
      metadata: { emailKind: "account-deleted" },
    })
  })

  it("reports a goodbye note it could not even prepare instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.getCurrentLocale.mockImplementation(() => {
      throw new Error("No request locale")
    })

    await expect(sendAccountDeletedEmail(goodbye)).resolves.toBe(false)
    await expect(handleSelfServiceDeletion(createdUser, deletionOn("http://localhost:3000"))).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, {
      detail: "Error: No request locale",
      metadata: { emailKind: "account-deleted" },
    })
  })

  it("keeps a completed deletion successful when the goodbye note is refused", async () => {
    refuseEmails()

    await expect(handleSelfServiceDeletion(createdUser, deletionOn("http://localhost:3000"))).resolves.toBeUndefined()

    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(createdUser.email, {
      detail: DOMAIN_NOT_VERIFIED,
      metadata: { emailKind: "account-deleted" },
    })
  })
})
