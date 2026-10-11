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
  passesTurnstile: vi.fn<(check: { action: string; hostname: string; remoteIp: string | undefined; token: string }) => Promise<boolean>>(),
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

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {},
}))

vi.mock("~/src/modules/newsletter/newsletter.accessors", () => ({ linkSubscriberToUser: stubs.linkSubscriberToUser }))
vi.mock("~/src/modules/order/order.claim.server", () => ({ claimGuestOrdersForUser: stubs.claimGuestOrdersForUser }))
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
vi.mock("~/src/integrations/cloudflare-turnstile/turnstile.server", () => ({ passesTurnstile: stubs.passesTurnstile }))

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

const { auth } = await import("~/src/integrations/better-auth/auth.server")

const { signInAudit } = await import("~/src/integrations/better-auth/auth.audit.server")

const [signInHook] = signInAudit.hooks.after

const NOW = new Date("2026-01-01T00:00:00.000Z")

const createdUser = {
  createdAt: NOW,
  email: "shopper@marte.test",
  emailVerified: true,
  id: "usr_1",
  name: "Ada",
  updatedAt: NOW,
}

const createdSession = {
  createdAt: NOW,
  expiresAt: NOW,
  id: "ses_1",
  ipAddress: null,
  token: "tok",
  updatedAt: NOW,
  userId: "usr_1",
}

beforeEach(() => {
  vi.resetAllMocks()
  stubs.resolveAuthAuditActor.mockReturnValue("customer-actor")
})

describe("sign-in audit hook", () => {
  it("leaves the address out when the new session carries none", async () => {
    const signIn = {
      context: { ...(await auth.$context), newSession: { session: createdSession, user: createdUser }, session: null },
      headers: new Headers(),
      path: "/sign-in/email",
    }

    await signInHook?.handler(signIn)

    expect(stubs.resolveAuthAuditActor).toHaveBeenCalledWith(createdUser)
    expect(stubs.recordAuthLoginAudit).toHaveBeenCalledWith("customer-actor", { ip: undefined, resourceId: "usr_1" })
  })
})
