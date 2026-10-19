import { type ReactElement } from "react"

import { describe, expect, it, vi } from "vite-plus/test"

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
  recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string }) => void>(),
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
vi.mock("~/src/modules/user/use-cases/erase-account-data.server", () => ({ eraseAccountData: stubs.eraseAccountData }))
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

vi.mock("~/src/modules/audit-log/audit-log.utils", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  resolveAuthAuditActor: stubs.resolveAuthAuditActor,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-auth-audit.server", () => ({
  recordAuthLoginAudit: stubs.recordAuthLoginAudit,
  recordAuthPasswordResetAudit: stubs.recordAuthPasswordResetAudit,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-customer-audit.server", () => ({
  recordCustomerDeletedAudit: stubs.recordCustomerDeletedAudit,
  recordCustomerRegisteredAudit: stubs.recordCustomerRegisteredAudit,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => ({
  recordEmailFailedAudit: stubs.recordEmailFailedAudit,
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

const { auth } = await import("~/src/integrations/better-auth/auth.server")

describe("auth configuration", () => {
  it("issues time-ordered identifiers so rows stay insert-ordered", () => {
    const first = auth.options.advanced.database.generateId()
    const second = auth.options.advanced.database.generateId()

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/u)
    expect(second).not.toBe(first)
  })

  it("trusts only Cloudflare's client address header", () => {
    expect(auth.options.advanced.ipAddress.ipAddressHeaders).toStrictEqual(["cf-connecting-ip"])
  })
})
