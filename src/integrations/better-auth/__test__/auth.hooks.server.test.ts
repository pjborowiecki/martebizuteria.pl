import { type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import type * as Seo from "~/src/lib/seo"

import accountDeletedPolish from "~/messages/pl-PL/emails.account-deleted.json"
import passwordChangedPolish from "~/messages/pl-PL/emails.password-changed.json"

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

const {
  guardAuthRequest,
  handleEmailVerified,
  handlePasswordReset,
  handleSelfServiceDeletion,
  handleUserCreated,
  handleUserDeleted,
  handleUserUpdated,
  requireAccountDataErased,
} = await import("~/src/integrations/better-auth/auth.hooks.server")

const seo = await vi.importActual<typeof Seo>("~/src/lib/seo")

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

const deletionOn = (origin: string): Request => new Request(`${origin}/api/auth/delete-user`, { method: "POST" })

const resetOn = (origin: string): Request => new Request(`${origin}/api/auth/reset-password`, { method: "POST" })

const sentEmail = (): SentEmail | undefined => stubs.sendEmail.mock.calls[0]?.[0]

const sentProp = (name: string): unknown => sentEmail()?.react.props[name]

beforeEach(() => {
  vi.resetAllMocks()
  stubs.resolveAuthAuditActor.mockReturnValue("customer-actor")
  stubs.getCurrentLocale.mockReturnValue(LOCALE)
  stubs.sendEmail.mockResolvedValue(undefined)
  stubs.isEmailSenderUnavailable.mockResolvedValue(false)
  stubs.admitPublicEmail.mockResolvedValue(true)
  stubs.buildLocalizedUrl.mockImplementation((_base, path, locale) => (path === "/" ? `/${locale}` : `/${locale}${path}`))
})

describe("customer list invalidation hooks", () => {
  it("records the registration and refreshes the admin customer list", async () => {
    await handleUserCreated(createdUser)

    expect(stubs.recordCustomerRegisteredAudit).toHaveBeenCalledWith(createdUser.email, {
      detail: createdUser.name,
      resourceId: createdUser.id,
    })
    expect(stubs.scheduleAdminCustomersInvalidation).toHaveBeenCalledOnce()
  })

  it("adopts guest orders for an account whose address a provider already verified", async () => {
    await handleUserCreated(createdUser)

    expect(stubs.claimGuestOrdersForUser).toHaveBeenCalledWith({ email: createdUser.email, userId: createdUser.id })
  })

  it("waits for verification before adopting guest orders on an unverified sign-up", async () => {
    await handleUserCreated({ ...createdUser, emailVerified: false })

    expect(stubs.claimGuestOrdersForUser).not.toHaveBeenCalled()
  })

  it("adopts guest orders once the address is verified", async () => {
    await handleEmailVerified(createdUser)

    expect(stubs.claimGuestOrdersForUser).toHaveBeenCalledWith({ email: createdUser.email, userId: createdUser.id })
  })

  it("links a newsletter subscription on that address to the verified account", async () => {
    await handleEmailVerified(createdUser)

    expect(stubs.linkSubscriberToUser).toHaveBeenCalledWith(createdUser.email, createdUser.id)
  })

  it("refreshes the admin customer list after an update", async () => {
    await handleUserUpdated()

    expect(stubs.scheduleAdminCustomersInvalidation).toHaveBeenCalledOnce()
  })

  it("refreshes the admin customer list after a deletion", async () => {
    await handleUserDeleted(createdUser, null)

    expect(stubs.scheduleAdminCustomersInvalidation).toHaveBeenCalledOnce()
  })
})

describe("account deletion", () => {
  it("erases the account's data before Better Auth deletes the account", async () => {
    stubs.eraseAccountData.mockResolvedValue(true)

    await expect(requireAccountDataErased(createdUser)).resolves.toBeUndefined()

    expect(stubs.eraseAccountData).toHaveBeenCalledExactlyOnceWith(createdUser)
  })

  it("stops the deletion with a retryable STRIPE_CUSTOMER_NOT_DELETED while Stripe keeps the saved cards", async () => {
    stubs.eraseAccountData.mockResolvedValue(false)

    await expect(requireAccountDataErased(createdUser)).rejects.toMatchObject({
      body: { code: "STRIPE_CUSTOMER_NOT_DELETED" },
      statusCode: 503,
    })
  })
})

describe("deleted account audit", () => {
  beforeEach(() => {
    stubs.resolveAuthAuditActor.mockImplementation((deleted: { id: string }) => `actor:${deleted.id}`)
  })

  it("credits a deletion made outside any request to the system", async () => {
    await handleUserDeleted(createdUser, null)

    expect(stubs.recordCustomerDeletedAudit).toHaveBeenCalledExactlyOnceWith("actor:usr_1", {
      actor: { name: "System", role: "system" },
      ip: undefined,
    })
  })
})

describe("password reset audit", () => {
  it("records the reset against the account, from the address the new password came from", async () => {
    stubs.resolveAuthAuditActor.mockReturnValue("customer-actor")

    await handlePasswordReset(
      { user: createdUser },
      new Request("https://marte.test/api/auth/reset-password", { headers: { "cf-connecting-ip": "198.51.100.9" } }),
    )

    expect(stubs.resolveAuthAuditActor).toHaveBeenCalledWith(createdUser)
    expect(stubs.recordAuthPasswordResetAudit).toHaveBeenCalledExactlyOnceWith("customer-actor", { ip: "198.51.100.9" })
  })

  it("records a reset made without a request with no address", async () => {
    stubs.resolveAuthAuditActor.mockReturnValue("customer-actor")

    await handlePasswordReset({ user: createdUser }, undefined)

    expect(stubs.recordAuthPasswordResetAudit).toHaveBeenCalledExactlyOnceWith("customer-actor", { ip: undefined })
  })
})

describe("account emails", () => {
  it("sends the goodbye note to the address of an account once it is deleted", async () => {
    await handleSelfServiceDeletion(createdUser, deletionOn("http://localhost:3000"))

    expect(sentEmail()?.to).toBe(createdUser.email)
    expect(sentEmail()?.subject).toBe(accountDeletedPolish.subject)
    expect(sentProp("name")).toBe(createdUser.name)
  })

  it.each(["http://localhost:3000", "http://127.0.0.1:3000"])(
    "links the goodbye note for an account deleted on %s back to that address",
    async (origin) => {
      stubs.buildLocalizedUrl.mockImplementation(seo.buildLocalizedUrl)

      await handleSelfServiceDeletion(createdUser, deletionOn(origin))

      expect(sentProp("storefrontUrl")).toBe(`${origin}/`)
    },
  )

  it("records a goodbye note it will not link to a host this build does not serve, and keeps the deletion successful", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(handleSelfServiceDeletion(createdUser, deletionOn("https://martebizuteria.pl.attacker.example"))).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(createdUser.email, {
      detail: `AppError: ${ERROR_CODES.FORBIDDEN}`,
      metadata: { emailKind: "account-deleted" },
    })
  })

  it("sends the password-changed email from a finished reset without holding up the sign-out of every device", async () => {
    await handlePasswordReset({ user: createdUser }, resetOn("http://localhost:3000"))

    await vi.waitFor(() => {
      expect(sentEmail()?.subject).toBe(passwordChangedPolish.subject)
    })
    expect(sentEmail()?.to).toBe(createdUser.email)
  })

  it("records a password-changed email for a reset that came with no request to link from, and keeps the reset successful", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(handlePasswordReset({ user: createdUser }, undefined)).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(createdUser.email, {
      detail: "The reset came with no request to link the sign-in page from",
      metadata: { emailKind: "password-changed" },
    })
  })

  it("records a goodbye note for a deletion that came with no request to link from, and keeps the deletion successful", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(handleSelfServiceDeletion(createdUser, undefined)).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(createdUser.email, {
      detail: "The deletion came with no request to link the storefront from",
      metadata: { emailKind: "account-deleted" },
    })
  })
})

const gate = (path: string): Promise<unknown> => {
  const endpointContext = { headers: new Headers(), path }

  return guardAuthRequest(endpointContext)
}

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
