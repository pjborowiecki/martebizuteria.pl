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
  readonly revealsAccountExistence?: boolean
  readonly subject: string
  readonly to: string
}

const stubs = vi.hoisted(() => ({
  buildLocalizedUrl: vi.fn<(base: string, path: string, locale: string) => string>(),
  claimGuestOrdersForUser: vi.fn<(input: { email: string; userId: string }) => Promise<number>>(),
  getCurrentLocale: vi.fn<() => string>(),
  isEmailSenderUnavailable: vi.fn<() => Promise<boolean>>(),
  linkSubscriberToUser: vi.fn<(email: string, userId: string) => Promise<void>>(),
  recordAuthLoginAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string }) => void>(),
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
  db: {},
}))

vi.mock("~/src/modules/newsletter/newsletter.accessors", () => ({ linkSubscriberToUser: stubs.linkSubscriberToUser }))
vi.mock("~/src/modules/order/order.claim.server", () => ({ claimGuestOrdersForUser: stubs.claimGuestOrdersForUser }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: stubs.scheduleAdminCustomersInvalidation,
}))

vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))
vi.mock("~/src/integrations/resend/resend.availability.server", () => ({ isEmailSenderUnavailable: stubs.isEmailSenderUnavailable }))

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: stubs.getCurrentLocale }))

vi.mock("~/src/lib/seo", () => ({ buildLocalizedUrl: stubs.buildLocalizedUrl }))

vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginAudit: stubs.recordAuthLoginAudit,
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

vi.mock("~/src/presentation/emails/reset-password", () => ({
  RESET_PASSWORD_NAMESPACE: "emails.reset-password",
  ResetPassword: () => null,
}))

vi.mock("~/src/presentation/emails/verify-email", () => ({
  VERIFY_EMAIL_NAMESPACE: "emails.verify-email",
  VerifyEmail: () => null,
}))

const { auth, sendAccountDeletedEmail, sendChangeEmailConfirmation, sendResetPassword, sendVerificationEmail, signInAudit } =
  await import("~/src/integrations/better-auth/auth.server")

const hooks = auth.options.databaseHooks

const [signInHook] = signInAudit.hooks.after

const NOW = new Date("2026-01-01T00:00:00.000Z")

const LOCALE = "pl-PL"

const STOREFRONT_HOME = `/${LOCALE}`

const ACCOUNT_CALLBACK = `/${LOCALE}/account/overview?verified=true`

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
  stubs.isEmailSenderUnavailable.mockResolvedValue(false)
  stubs.buildLocalizedUrl.mockImplementation((_base, path, locale) => (path === "/" ? `/${locale}` : `/${locale}${path}`))
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

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const RESET_URL = "https://marte.test/api/auth/reset-password/secret-reset-token?callbackURL=%2Fen-US%2Fauth%2Freset-password"

const refuseEmails = () => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  stubs.sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)
}

const gate = (path: string): Promise<unknown> => {
  const endpointContext = { headers: new Headers(), path }

  return auth.options.hooks.before(endpointContext)
}

describe("auth email delivery", () => {
  it.each([
    ["reset-password", () => sendResetPassword({ url: RESET_URL, user })],
    ["verification", () => sendVerificationEmail({ url: verifyUrl(), user })],
    ["change-email confirmation", () => sendChangeEmailConfirmation({ url: "https://marte.test/change", user })],
  ])("answers a refused %s email with a retryable EMAIL_DELIVERY_FAILED", async (_kind, send) => {
    refuseEmails()

    await expect(send()).rejects.toMatchObject({ body: { code: "EMAIL_DELIVERY_FAILED" }, statusCode: 503 })
  })

  it("records a refused auth email in the audit log without the link it carried", async () => {
    refuseEmails()

    await expect(sendResetPassword({ url: RESET_URL, user })).rejects.toThrow()

    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, { detail: `Auth reset-password email — ${DOMAIN_NOT_VERIFIED}` })
    expect(JSON.stringify(stubs.recordEmailFailedAudit.mock.calls)).not.toContain("secret-reset-token")
  })

  it("logs a refused auth email with its kind and recipient", async () => {
    refuseEmails()

    await expect(sendChangeEmailConfirmation({ url: "https://marte.test/change", user })).rejects.toThrow()

    expect(console.error).toHaveBeenCalledWith(
      `[Auth] Failed to send change-email confirmation email to ${user.email}: ${DOMAIN_NOT_VERIFIED}`,
    )
  })

  it.each([
    ["reset-password", () => sendResetPassword({ url: RESET_URL, user })],
    ["verification", () => sendVerificationEmail({ url: verifyUrl(), user })],
    ["change-email confirmation", () => sendChangeEmailConfirmation({ url: "https://marte.test/change", user })],
  ])("keeps the %s email, sent only for some addresses, from marking the sender unavailable", async (_kind, send) => {
    await send()

    expect(sentEmail()?.revealsAccountExistence).toBe(true)
  })

  it("lets a goodbye note, whose sending says nothing about other accounts, mark the sender unavailable", async () => {
    await sendAccountDeletedEmail({ email: user.email, name: user.name })

    expect(sentEmail()?.revealsAccountExistence).toBeUndefined()
  })

  it("records nothing when the provider accepts the message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(sendResetPassword({ url: RESET_URL, user })).resolves.toBeUndefined()

    expect(log).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).not.toHaveBeenCalled()
  })

  it("reports whether the goodbye note went out instead of throwing", async () => {
    await expect(sendAccountDeletedEmail({ email: user.email, name: user.name })).resolves.toBe(true)

    refuseEmails()

    await expect(sendAccountDeletedEmail({ email: user.email, name: user.name })).resolves.toBe(false)
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, { detail: `Auth account-deleted email — ${DOMAIN_NOT_VERIFIED}` })
  })

  it("reports a goodbye note it could not even prepare instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.getCurrentLocale.mockImplementation(() => {
      throw new Error("No request locale")
    })

    await expect(sendAccountDeletedEmail({ email: user.email, name: user.name })).resolves.toBe(false)
    await expect(auth.options.user.deleteUser.afterDelete(createdUser)).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, {
      detail: "Auth account-deleted email — Error: No request locale",
    })
  })

  it("keeps a completed deletion successful when the goodbye note is refused", async () => {
    refuseEmails()

    await expect(auth.options.user.deleteUser.afterDelete(createdUser)).resolves.toBeUndefined()

    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(createdUser.email, {
      detail: `Auth account-deleted email — ${DOMAIN_NOT_VERIFIED}`,
    })
  })
})

describe("email delivery gate", () => {
  it.each(["/sign-up/email", "/request-password-reset", "/send-verification-email", "/change-email"])(
    "refuses %s while the sender is unavailable, before anything is created or sent",
    async (path) => {
      stubs.isEmailSenderUnavailable.mockResolvedValue(true)

      await expect(gate(path)).rejects.toMatchObject({ body: { code: "EMAIL_DELIVERY_UNAVAILABLE" }, statusCode: 503 })
    },
  )

  it("lets the email-sending endpoints through while the sender is available", async () => {
    await gate("/request-password-reset")

    expect(stubs.isEmailSenderUnavailable).toHaveBeenCalledOnce()
  })

  it.each(["/sign-in/email", "/verify-email", "/delete-user", "/get-session"])(
    "lets %s through without reading the flag, even while the sender is unavailable",
    async (path) => {
      stubs.isEmailSenderUnavailable.mockResolvedValue(true)

      await gate(path)

      expect(stubs.isEmailSenderUnavailable).not.toHaveBeenCalled()
    },
  )
})
