import { type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import type * as Seo from "~/src/lib/seo"

import accountDeletedEnglish from "~/messages/en-US/emails.account-deleted.json"
import accountDeletedPolish from "~/messages/pl-PL/emails.account-deleted.json"
import changeEmailPolish from "~/messages/pl-PL/emails.change-email.json"
import passwordChangedPolish from "~/messages/pl-PL/emails.password-changed.json"
import resetPasswordPolish from "~/messages/pl-PL/emails.reset-password.json"
import verifyEmailPolish from "~/messages/pl-PL/emails.verify-email.json"

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

const {
  auth,
  sendAccountDeletedEmail,
  sendChangeEmailConfirmation,
  sendPasswordChangedEmail,
  sendResetPassword,
  sendVerificationEmail,
  signInAudit,
} = await import("~/src/integrations/better-auth/auth.server")

const seo = await vi.importActual<typeof Seo>("~/src/lib/seo")

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

const goodbye = { email: user.email, name: user.name, origin: "http://127.0.0.1:3000" }

const deletionOn = (origin: string): Request => new Request(`${origin}/api/auth/delete-user`, { method: "POST" })

const resetOn = (origin: string): Request => new Request(`${origin}/api/auth/reset-password`, { method: "POST" })

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
  stubs.admitPublicEmail.mockResolvedValue(true)
  stubs.passesTurnstile.mockResolvedValue(true)
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

describe("account deletion", () => {
  it("erases the account's data before Better Auth deletes the account", async () => {
    stubs.eraseAccountData.mockResolvedValue(true)

    await expect(auth.options.user.deleteUser.beforeDelete(createdUser)).resolves.toBeUndefined()

    expect(stubs.eraseAccountData).toHaveBeenCalledExactlyOnceWith(createdUser)
  })

  it("stops the deletion with a retryable STRIPE_CUSTOMER_NOT_DELETED while Stripe keeps the saved cards", async () => {
    stubs.eraseAccountData.mockResolvedValue(false)

    await expect(auth.options.user.deleteUser.beforeDelete(createdUser)).rejects.toMatchObject({
      body: { code: "STRIPE_CUSTOMER_NOT_DELETED" },
      statusCode: 503,
    })
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

  it("counts the email against the verification emails the address may receive", async () => {
    await sendVerificationEmail({ url: verifyUrl(), user })

    expect(stubs.admitPublicEmail).toHaveBeenCalledExactlyOnceWith({ kind: "verification", to: user.email })
  })

  it("sends nothing, and answers as if it had, once the limits refuse the email", async () => {
    stubs.admitPublicEmail.mockResolvedValue(false)

    await expect(sendVerificationEmail({ url: verifyUrl(), user })).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
  })
})

describe("account emails", () => {
  it("sends a reset-password link", async () => {
    await sendResetPassword({ url: "https://marte.test/reset", user })

    expect(sentEmail()?.subject).toBe(resetPasswordPolish.subject)
    expect(sentProp("resetPasswordUrl")).toBe("https://marte.test/reset")
    expect(stubs.admitPublicEmail).toHaveBeenCalledExactlyOnceWith({ kind: "password-reset", to: user.email })
  })

  it("sends no reset-password link, and answers as if it had, once the limits refuse the email", async () => {
    stubs.admitPublicEmail.mockResolvedValue(false)

    await expect(sendResetPassword({ url: "https://marte.test/reset", user })).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
  })

  it("sends a change-email confirmation", async () => {
    await sendChangeEmailConfirmation({ url: "https://marte.test/change", user })

    expect(sentEmail()?.subject).toBe(changeEmailPolish.subject)
  })

  it("sends a goodbye note under the locale it is given, linking to the storefront it was sent from", async () => {
    stubs.buildLocalizedUrl.mockImplementation(seo.buildLocalizedUrl)

    await sendAccountDeletedEmail({ ...goodbye, locale: "en-US" })

    expect(sentEmail()?.subject).toBe(accountDeletedEnglish.subject)
    expect(sentProp("storefrontUrl")).toBe("http://127.0.0.1:3000/en-US")
  })

  it("falls back to the request locale for a goodbye note and links a Polish reader to the unprefixed storefront", async () => {
    stubs.buildLocalizedUrl.mockImplementation(seo.buildLocalizedUrl)

    await sendAccountDeletedEmail(goodbye)

    expect(sentEmail()?.subject).toBe(accountDeletedPolish.subject)
    expect(sentProp("storefrontUrl")).toBe("http://127.0.0.1:3000/")
  })

  it("sends the goodbye note to the address of an account once it is deleted", async () => {
    await auth.options.user.deleteUser.afterDelete(createdUser, deletionOn("http://localhost:3000"))

    expect(sentEmail()?.to).toBe(createdUser.email)
    expect(sentEmail()?.subject).toBe(accountDeletedPolish.subject)
    expect(sentProp("name")).toBe(createdUser.name)
  })

  it.each(["http://localhost:3000", "http://127.0.0.1:3000"])(
    "links the goodbye note for an account deleted on %s back to that address",
    async (origin) => {
      stubs.buildLocalizedUrl.mockImplementation(seo.buildLocalizedUrl)

      await auth.options.user.deleteUser.afterDelete(createdUser, deletionOn(origin))

      expect(sentProp("storefrontUrl")).toBe(`${origin}/`)
    },
  )

  it("records a goodbye note it will not link to a host this build does not serve, and keeps the deletion successful", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(
      auth.options.user.deleteUser.afterDelete(createdUser, deletionOn("https://martebizuteria.pl.attacker.example")),
    ).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(createdUser.email, {
      detail: `Auth account-deleted email — AppError: ${ERROR_CODES.FORBIDDEN}`,
    })
  })

  it("tells the customer the password was changed, linking to sign-in on the address the reset came in on", async () => {
    stubs.buildLocalizedUrl.mockImplementation(seo.buildLocalizedUrl)

    await sendPasswordChangedEmail({ request: resetOn("http://127.0.0.1:3000"), user })

    expect(sentEmail()?.to).toBe(user.email)
    expect(sentEmail()?.subject).toBe(passwordChangedPolish.subject)
    expect(sentProp("name")).toBe(user.name)
    expect(sentProp("signInUrl")).toBe("http://127.0.0.1:3000/auth/sign-in")
  })

  it("sends the password-changed email from a finished reset without holding up the sign-out of every device", async () => {
    await auth.options.emailAndPassword.onPasswordReset({ user: createdUser }, resetOn("http://localhost:3000"))

    await vi.waitFor(() => {
      expect(sentEmail()?.subject).toBe(passwordChangedPolish.subject)
    })
    expect(sentEmail()?.to).toBe(createdUser.email)
  })

  it("records a password-changed email it will not link to a host this build does not serve, and keeps the reset successful", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(
      sendPasswordChangedEmail({ request: resetOn("https://martebizuteria.pl.attacker.example"), user }),
    ).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, {
      detail: `Auth password-changed email — AppError: ${ERROR_CODES.FORBIDDEN}`,
    })
  })

  it("records a password-changed email for a reset that came with no request to link from, and keeps the reset successful", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(auth.options.emailAndPassword.onPasswordReset({ user: createdUser }, undefined)).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(createdUser.email, {
      detail: "Auth password-changed email — The reset came with no request to link the sign-in page from",
    })
  })

  it("records a goodbye note for a deletion that came with no request to link from, and keeps the deletion successful", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(auth.options.user.deleteUser.afterDelete(createdUser, undefined)).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(createdUser.email, {
      detail: "Auth account-deleted email — The deletion came with no request to link the storefront from",
    })
  })
})

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const RESET_URL = "https://marte.test/api/auth/reset-password/secret-reset-token?callbackURL=%2Fen-US%2Fauth%2Freset-password"

const refuseEmails = () => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  stubs.sendEmail.mockResolvedValue(DOMAIN_NOT_VERIFIED)
}

const gate = (path: string, request?: Request): Promise<unknown> => {
  const endpointContext = request === undefined ? { headers: new Headers(), path } : { headers: request.headers, path, request }

  return auth.options.hooks.before(endpointContext)
}

const browserRequest = (path: string, turnstileToken?: string): Request =>
  new Request(`https://martebizuteria.pl/api/auth${path}`, {
    headers: { "cf-connecting-ip": "203.0.113.7", ...(turnstileToken === undefined ? {} : { "x-turnstile-token": turnstileToken }) },
    method: "POST",
  })

const BOT_CHECK_REFUSAL = { body: { code: "BOT_CHECK_FAILED" }, statusCode: 403 }

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
      detail: `Auth password-changed email — ${DOMAIN_NOT_VERIFIED}`,
    })
  })

  it("records nothing when the provider accepts the message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(sendResetPassword({ url: RESET_URL, user })).resolves.toBeUndefined()

    expect(log).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).not.toHaveBeenCalled()
  })

  it("reports whether the goodbye note went out instead of throwing", async () => {
    await expect(sendAccountDeletedEmail(goodbye)).resolves.toBe(true)

    refuseEmails()

    await expect(sendAccountDeletedEmail(goodbye)).resolves.toBe(false)
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, { detail: `Auth account-deleted email — ${DOMAIN_NOT_VERIFIED}` })
  })

  it("reports a goodbye note it could not even prepare instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.getCurrentLocale.mockImplementation(() => {
      throw new Error("No request locale")
    })

    await expect(sendAccountDeletedEmail(goodbye)).resolves.toBe(false)
    await expect(auth.options.user.deleteUser.afterDelete(createdUser, deletionOn("http://localhost:3000"))).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, {
      detail: "Auth account-deleted email — Error: No request locale",
    })
  })

  it("keeps a completed deletion successful when the goodbye note is refused", async () => {
    refuseEmails()

    await expect(auth.options.user.deleteUser.afterDelete(createdUser, deletionOn("http://localhost:3000"))).resolves.toBeUndefined()

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
    await gate("/request-password-reset", browserRequest("/request-password-reset", "turnstile-token-1"))

    expect(stubs.isEmailSenderUnavailable).toHaveBeenCalledOnce()
  })

  it("refuses while the sender is unavailable without asking Turnstile about the token", async () => {
    stubs.isEmailSenderUnavailable.mockResolvedValue(true)

    await expect(gate("/sign-up/email", browserRequest("/sign-up/email", "turnstile-token-1"))).rejects.toMatchObject({ statusCode: 503 })
    expect(stubs.passesTurnstile).not.toHaveBeenCalled()
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

describe("bot check gate", () => {
  it.each([
    ["/sign-up/email", "sign-up"],
    ["/request-password-reset", "password-reset"],
    ["/send-verification-email", "verification-resend"],
  ])("lets %s through with a token Turnstile passes for the %s action on the request's host and address", async (path, action) => {
    await gate(path, browserRequest(path, "turnstile-token-1"))

    expect(stubs.passesTurnstile).toHaveBeenCalledExactlyOnceWith({
      action,
      hostname: "martebizuteria.pl",
      remoteIp: "203.0.113.7",
      token: "turnstile-token-1",
    })
  })

  it.each(["/sign-up/email", "/request-password-reset", "/send-verification-email"])(
    "refuses %s when Turnstile does not pass the token",
    async (path) => {
      stubs.passesTurnstile.mockResolvedValue(false)

      await expect(gate(path, browserRequest(path, "turnstile-token-1"))).rejects.toMatchObject(BOT_CHECK_REFUSAL)
    },
  )

  it.each([
    ["no token", undefined],
    ["an empty token", ""],
    ["a token too long to be one Turnstile issued", "t".repeat(2049)],
  ])("refuses a sign-up with %s without asking Turnstile", async (_label, token) => {
    await expect(gate("/sign-up/email", browserRequest("/sign-up/email", token))).rejects.toMatchObject(BOT_CHECK_REFUSAL)
    expect(stubs.passesTurnstile).not.toHaveBeenCalled()
  })

  it("refuses a sign-up that arrives without a request to check", async () => {
    await expect(gate("/sign-up/email")).rejects.toMatchObject(BOT_CHECK_REFUSAL)
    expect(stubs.passesTurnstile).not.toHaveBeenCalled()
  })

  it.each(["/sign-in/email", "/change-email", "/reset-password", "/verify-email"])(
    "leaves %s to the session and the rate limits, with no token asked for",
    async (path) => {
      await gate(path, browserRequest(path))

      expect(stubs.passesTurnstile).not.toHaveBeenCalled()
    },
  )
})
