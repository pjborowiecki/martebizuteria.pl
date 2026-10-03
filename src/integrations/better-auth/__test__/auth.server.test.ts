import { type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { APP_URL } from "~/src/presentation/branding/app"

import accountDeletedEnglish from "~/messages/en-US/emails.account-deleted.json"
import accountDeletedPolish from "~/messages/pl-PL/emails.account-deleted.json"
import changeEmailPolish from "~/messages/pl-PL/emails.change-email.json"
import resetPasswordPolish from "~/messages/pl-PL/emails.reset-password.json"
import verifyEmailPolish from "~/messages/pl-PL/emails.verify-email.json"

interface SentEmail {
  readonly react: ReactElement<Record<string, unknown>>
  readonly subject: string
  readonly to: string
}

const stubs = vi.hoisted(() => ({
  buildLocalizedUrl: vi.fn<(base: string, path: string, locale: string) => string>(),
  claimGuestOrdersForUser: vi.fn<(input: { email: string; userId: string }) => Promise<number>>(),
  findFirst: vi.fn(),
  getCurrentLocale: vi.fn<() => string>(),
  linkSubscriberToUser: vi.fn<(email: string, userId: string) => Promise<void>>(),
  recordAuthLoginAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn(),
  scheduleAdminCustomersInvalidation: vi.fn(),
  sendEmail: vi.fn<(input: SentEmail) => Promise<string | undefined>>(),
}))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GITHUB_CLIENT_ID: "test-github-client",
    AUTH_GITHUB_CLIENT_SECRET: "test-github-secret",
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { query: { user: { findFirst: stubs.findFirst } } },
}))

vi.mock("~/src/modules/newsletter/newsletter.accessors", () => ({ linkSubscriberToUser: stubs.linkSubscriberToUser }))
vi.mock("~/src/modules/order/order.claim.server", () => ({ claimGuestOrdersForUser: stubs.claimGuestOrdersForUser }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: stubs.scheduleAdminCustomersInvalidation,
}))

vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: stubs.getCurrentLocale }))

vi.mock("~/src/lib/seo", () => ({ buildLocalizedUrl: stubs.buildLocalizedUrl }))

vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginAudit: stubs.recordAuthLoginAudit,
  recordCustomerRegisteredAudit: stubs.recordCustomerRegisteredAudit,
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

vi.mock("~/src/presentation/emails/reset-password", () => ({
  RESET_PASSWORD_NAMESPACE: "emails.reset-password",
  ResetPassword: () => null,
}))

vi.mock("~/src/presentation/emails/verify-email", () => ({
  VERIFY_EMAIL_NAMESPACE: "emails.verify-email",
  VerifyEmail: () => null,
}))

const { auth, sendAccountDeletedEmail, sendChangeEmailConfirmation, sendResetPassword, sendVerificationEmail } =
  await import("~/src/integrations/better-auth/auth.server")

const hooks = auth.options.databaseHooks

const NOW = new Date("2026-01-01T00:00:00.000Z")

const LOCALE = "pl-PL"

const STOREFRONT_HOME = `/${LOCALE}`

const ACCOUNT_CALLBACK = `/${LOCALE}/account/overview?verified=true`

const createdSession = {
  createdAt: NOW,
  expiresAt: NOW,
  id: "ses_1",
  ipAddress: "203.0.113.7",
  token: "tok",
  updatedAt: NOW,
  userId: "usr_1",
}

const createdUser = {
  createdAt: NOW,
  email: "shopper@marte.test",
  emailVerified: true,
  id: "usr_1",
  name: "Ada",
  updatedAt: NOW,
}

const user = { email: "shopper@marte.test", name: "Ada" }

const verifyUrl = (callback?: string): string =>
  callback === undefined
    ? "https://marte.test/api/auth/verify-email?token=tok"
    : `https://marte.test/api/auth/verify-email?token=tok&callbackURL=${encodeURIComponent(callback)}`

const sentEmail = (): SentEmail | undefined => stubs.sendEmail.mock.calls[0]?.[0]

const sentProp = (name: string): unknown => sentEmail()?.react.props[name]

beforeEach(() => {
  vi.resetAllMocks()
  stubs.resolveAuthAuditActor.mockReturnValue("customer-actor")
  stubs.getCurrentLocale.mockReturnValue(LOCALE)
  stubs.sendEmail.mockResolvedValue(undefined)
  stubs.buildLocalizedUrl.mockImplementation((_base, path, locale) => (path === "/" ? `/${locale}` : `/${locale}${path}`))
})

describe("session creation hook", () => {
  it("records the sign-in against the user the session belongs to", async () => {
    stubs.findFirst.mockResolvedValue(createdUser)

    await hooks.session.create.after(createdSession)

    expect(stubs.resolveAuthAuditActor).toHaveBeenCalledWith(createdUser)
    expect(stubs.recordAuthLoginAudit).toHaveBeenCalledWith("customer-actor", { ip: "203.0.113.7", resourceId: "usr_1" })
  })

  it("leaves the address out when the session carries none", async () => {
    stubs.findFirst.mockResolvedValue(createdUser)

    await hooks.session.create.after({ ...createdSession, ipAddress: null })

    expect(stubs.recordAuthLoginAudit).toHaveBeenCalledWith("customer-actor", { ip: undefined, resourceId: "usr_1" })
  })

  it("records nothing when the session has no user row to attribute it to", async () => {
    stubs.findFirst.mockResolvedValue(undefined)

    await hooks.session.create.after(createdSession)

    expect(stubs.recordAuthLoginAudit).not.toHaveBeenCalled()
  })
})

describe("customer list invalidation hooks", () => {
  it("records the registration and refreshes the admin customer list", async () => {
    await hooks.user.create.after(createdUser)

    expect(stubs.recordCustomerRegisteredAudit).toHaveBeenCalledWith(createdUser.email, {
      detail: createdUser.name,
      resourceId: createdUser.id,
    })
    expect(stubs.scheduleAdminCustomersInvalidation).toHaveBeenCalledOnce()
  })

  it("adopts guest orders for an account whose address a provider already verified", async () => {
    await hooks.user.create.after(createdUser)

    expect(stubs.claimGuestOrdersForUser).toHaveBeenCalledWith({ email: createdUser.email, userId: createdUser.id })
  })

  it("waits for verification before adopting guest orders on an unverified sign-up", async () => {
    await hooks.user.create.after({ ...createdUser, emailVerified: false })

    expect(stubs.claimGuestOrdersForUser).not.toHaveBeenCalled()
  })

  it("adopts guest orders once the address is verified", async () => {
    await auth.options.emailVerification.afterEmailVerification(createdUser)

    expect(stubs.claimGuestOrdersForUser).toHaveBeenCalledWith({ email: createdUser.email, userId: createdUser.id })
  })

  it("links a newsletter subscription on that address to the verified account", async () => {
    await auth.options.emailVerification.afterEmailVerification(createdUser)

    expect(stubs.linkSubscriberToUser).toHaveBeenCalledWith(createdUser.email, createdUser.id)
  })

  it("refreshes the admin customer list after an update", async () => {
    await hooks.user.update.after()

    expect(stubs.scheduleAdminCustomersInvalidation).toHaveBeenCalledOnce()
  })

  it("refreshes the admin customer list after a deletion", async () => {
    await hooks.user.delete.after()

    expect(stubs.scheduleAdminCustomersInvalidation).toHaveBeenCalledOnce()
  })
})

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

describe("verification email", () => {
  it.each([["/"], [STOREFRONT_HOME], [`${STOREFRONT_HOME}?promo=1`]])(
    "steers the storefront callback %s to the account overview",
    async (callback) => {
      await sendVerificationEmail({ url: verifyUrl(callback), user })

      expect(sentProp("verificationUrl")).toBe(verifyUrl(ACCOUNT_CALLBACK))
    },
  )

  it("leaves a callback that already points somewhere else alone", async () => {
    const url = verifyUrl("/pl-PL/account/orders")

    await sendVerificationEmail({ url, user })

    expect(sentProp("verificationUrl")).toBe(url)
  })

  it("leaves a link without a callback alone", async () => {
    await sendVerificationEmail({ url: verifyUrl(), user })

    expect(sentProp("verificationUrl")).toBe(verifyUrl())
  })

  it("leaves a link it cannot parse alone", async () => {
    await sendVerificationEmail({ url: "not-a-url", user })

    expect(sentProp("verificationUrl")).toBe("not-a-url")
  })

  it("sends under the localized verification subject", async () => {
    await sendVerificationEmail({ url: verifyUrl(), user })

    expect(sentEmail()?.subject).toBe(verifyEmailPolish.subject)
  })
})

describe("account emails", () => {
  it("sends a reset-password link", async () => {
    await sendResetPassword({ url: "https://marte.test/reset", user })

    expect(sentEmail()?.subject).toBe(resetPasswordPolish.subject)
    expect(sentProp("resetPasswordUrl")).toBe("https://marte.test/reset")
  })

  it("sends a change-email confirmation", async () => {
    await sendChangeEmailConfirmation({ url: "https://marte.test/change", user })

    expect(sentEmail()?.subject).toBe(changeEmailPolish.subject)
  })

  it("sends a goodbye note under the locale it is given", async () => {
    await sendAccountDeletedEmail({ email: user.email, locale: "en-US", name: user.name })

    expect(sentEmail()?.subject).toBe(accountDeletedEnglish.subject)
    expect(sentProp("storefrontUrl")).toBe(`${APP_URL}/en-US`)
  })

  it("falls back to the request locale for a goodbye note", async () => {
    await sendAccountDeletedEmail({ email: user.email, name: user.name })

    expect(sentEmail()?.subject).toBe(accountDeletedPolish.subject)
    expect(sentProp("storefrontUrl")).toBe(`${APP_URL}/${LOCALE}`)
  })

  it("sends the goodbye note to the address of an account once it is deleted", async () => {
    await auth.options.user.deleteUser.afterDelete(createdUser)

    expect(sentEmail()?.to).toBe(createdUser.email)
    expect(sentEmail()?.subject).toBe(accountDeletedPolish.subject)
    expect(sentProp("name")).toBe(createdUser.name)
  })
})

describe("delivery reporting", () => {
  it("stays quiet when the provider accepts the message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    await sendResetPassword({ url: "https://marte.test/reset", user })

    expect(log).not.toHaveBeenCalled()
  })

  it("reports a transport failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.sendEmail.mockResolvedValue("network down")

    await sendResetPassword({ url: "https://marte.test/reset", user })

    expect(log).toHaveBeenCalledWith(`[Auth] Failed to send reset-password email to ${user.email}: network down`)
  })

  it("reports a provider rejection", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.sendEmail.mockResolvedValue("rejected")

    await sendChangeEmailConfirmation({ url: "https://marte.test/change", user })

    expect(log).toHaveBeenCalledWith(`[Auth] Failed to send change-email confirmation email to ${user.email}: rejected`)
  })

  it("reports a failed verification send", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.sendEmail.mockResolvedValue("rejected")

    await sendVerificationEmail({ url: verifyUrl(), user })

    expect(log).toHaveBeenCalledWith(`[Auth] Failed to send verification email to ${user.email}: rejected`)
  })

  it("reports a failed goodbye send", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.sendEmail.mockResolvedValue("rejected")

    await sendAccountDeletedEmail({ email: user.email, name: user.name })

    expect(log).toHaveBeenCalledWith(`[Auth] Failed to send account-deleted email to ${user.email}: rejected`)
  })
})
