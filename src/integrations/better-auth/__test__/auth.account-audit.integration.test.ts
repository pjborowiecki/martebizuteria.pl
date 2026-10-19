import { type ReactElement } from "react"

import { createEmailVerificationToken } from "better-auth/api"
import { symmetricDecrypt } from "better-auth/crypto"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import {
  AUTH_BASE_URL,
  type AuthBrowser,
  CUSTOMER_PASSWORD,
  createPasswordCustomer,
  openAuthBrowser,
} from "~/src/platform/testing/lib/auth-browser"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { auth } from "~/src/integrations/better-auth/auth.server"

interface SentEmail {
  readonly react: ReactElement<{ readonly resetPasswordUrl: string }>
  readonly to: string
}

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const audit = vi.hoisted(() => ({
  recordAuthEmailChangedAudit: vi.fn(),
  recordAuthEmailVerifiedAudit: vi.fn(),
  recordAuthLoginAudit: vi.fn(),
  recordAuthPasswordChangedAudit: vi.fn(),
  recordAuthPasswordResetAudit: vi.fn(),
  recordAuthSessionsRevokedAudit: vi.fn(),
  recordAuthTwoFactorDisabledAudit: vi.fn(),
  recordAuthTwoFactorEnabledAudit: vi.fn(),
  recordAuthUserBannedAudit: vi.fn(),
  recordAuthUserUnbannedAudit: vi.fn(),
  recordCustomerDeletedAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  recordEmailFailedAudit: vi.fn(),
  recordEmailSentAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn((user: { id: string }) => `actor:${user.id}`),
}))

const mail = vi.hoisted(() => ({ sendEmail: vi.fn<(email: SentEmail) => Promise<undefined>>() }))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => mail)
vi.mock("~/src/integrations/resend/resend.availability.server", () => ({ isEmailSenderUnavailable: () => Promise.resolve(false) }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => audit)
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminAuditLogInvalidation: vi.fn(),
  scheduleAdminCustomersInvalidation: vi.fn(),
  scheduleAdminNewsletterSubscribersInvalidation: vi.fn(),
}))
vi.mock(import("~/src/modules/order/order.claim.server"), async (importOriginal) => ({
  ...(await importOriginal()),
  claimGuestOrdersForUser: vi.fn(() => Promise.resolve(0)),
}))
vi.mock(import("~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors"), async (importOriginal) => ({
  ...(await importOriginal()),
  linkSubscriberToUser: vi.fn(() => Promise.resolve()),
}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const twoFactorRow = z.object({ secret: z.string() })

const sessionRow = z.object({ token: z.string() })

const currentCode = async (userId: string): Promise<string> => {
  const row = twoFactorRow.parse(sqlite.prepare("select secret from two_factor where user_id = ?").get(userId))
  const context = await auth.$context
  const secret = await symmetricDecrypt({ data: row.secret, key: context.secretConfig })
  const { code } = await auth.api.generateTOTP({ body: { secret }, headers: new Headers({ host: new URL(AUTH_BASE_URL).host }) })

  return code
}

const turnOnTwoFactor = async (browser: AuthBrowser, userId: string): Promise<Response> => {
  await browser.post("/two-factor/enable", { password: CUSTOMER_PASSWORD })

  return browser.post("/two-factor/verify-totp", { code: await currentCode(userId) })
}

const signedIn = async (email: string, ip: string): Promise<Readonly<{ browser: AuthBrowser; userId: string }>> => {
  const userId = await createPasswordCustomer(email)
  const browser = openAuthBrowser(ip)
  await browser.signIn(email)

  return { browser, userId }
}

const signedInAdmin = async (email: string, ip: string): Promise<Readonly<{ browser: AuthBrowser; userId: string }>> => {
  const admin = await signedIn(email, ip)
  sqlite.prepare("update user set role = 'admin', two_factor_enabled = 1 where id = ?").run(admin.userId)

  return admin
}

const tokenOfSessionFrom = (ip: string): string =>
  sessionRow.parse(sqlite.prepare("select token from session where ip_address = ?").get(ip)).token

const sentResetLink = (): Promise<string> =>
  vi.waitFor(() => {
    const call = mail.sendEmail.mock.lastCall
    if (call === undefined) {
      throw new Error("No reset link has been sent yet")
    }

    return call[0].react.props.resetPasswordUrl
  })

const emailChangeLink = async (from: string, to: string, requestType: string): Promise<string> => {
  const { secret } = await auth.$context
  const token = await createEmailVerificationToken(secret, from, to, 3600, { requestType })

  return `${AUTH_BASE_URL}/verify-email?token=${token}`
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  mail.sendEmail.mockResolvedValue(undefined)
})

afterAll(() => {
  sqlite.close()
})

describe("a customer changing their own password", () => {
  it("is recorded against the customer, from the address the change came from", async () => {
    const { browser, userId } = await signedIn("password@marte.test", "198.51.100.60")

    const response = await browser.post("/change-password", { currentPassword: CUSTOMER_PASSWORD, newPassword: `${CUSTOMER_PASSWORD}-2` })

    expect(response.status).toBe(200)
    expect(audit.recordAuthPasswordChangedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, { ip: "198.51.100.60" })
    expect(audit.recordAuthSessionsRevokedAudit).not.toHaveBeenCalled()
  })

  it("also records the other devices it signs out when the customer asks for that", async () => {
    const { browser, userId } = await signedIn("password-everywhere@marte.test", "198.51.100.61")

    await browser.post("/change-password", {
      currentPassword: CUSTOMER_PASSWORD,
      newPassword: `${CUSTOMER_PASSWORD}-2`,
      revokeOtherSessions: true,
    })

    expect(audit.recordAuthPasswordChangedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, { ip: "198.51.100.61" })
    expect(audit.recordAuthSessionsRevokedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, { ip: "198.51.100.61" })
  })

  it("records nothing when the current password is wrong", async () => {
    const { browser } = await signedIn("password-wrong@marte.test", "198.51.100.62")

    const response = await browser.post("/change-password", { currentPassword: "not-the-password", newPassword: `${CUSTOMER_PASSWORD}-2` })

    expect(response.status).toBe(400)
    expect(audit.recordAuthPasswordChangedAudit).not.toHaveBeenCalled()
  })
})

describe("a password reset", () => {
  it("is recorded against the account once the link sets the new password", async () => {
    const userId = await createPasswordCustomer("forgot@marte.test")
    const browser = openAuthBrowser("198.51.100.63")
    await browser.post("/request-password-reset", { email: "forgot@marte.test", redirectTo: "/en-US/auth/reset-password" })
    const token = new URL(await sentResetLink()).pathname.split("/").at(-1)

    const response = await browser.post("/reset-password", { newPassword: `${CUSTOMER_PASSWORD}-new`, token })

    expect(response.status).toBe(200)
    expect(audit.recordAuthPasswordResetAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, { ip: "198.51.100.63" })
  })

  it("records nothing for a link that is not valid", async () => {
    const response = await openAuthBrowser("198.51.100.64").post("/reset-password", {
      newPassword: `${CUSTOMER_PASSWORD}-new`,
      token: "invented",
    })

    expect(response.status).toBe(400)
    expect(audit.recordAuthPasswordResetAudit).not.toHaveBeenCalled()
  })
})

describe("two-factor authentication", () => {
  it("is recorded as turned on once the first code confirms it, and not again on a later two-factor sign-in", async () => {
    const { browser, userId } = await signedIn("enrol@marte.test", "198.51.100.65")

    await turnOnTwoFactor(browser, userId)

    expect(audit.recordAuthTwoFactorEnabledAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, { ip: "198.51.100.65" })

    const later = openAuthBrowser("198.51.100.66")
    await later.signIn("enrol@marte.test")
    const completed = await later.post("/two-factor/verify-totp", { code: await currentCode(userId) })

    expect(completed.status).toBe(200)
    expect(audit.recordAuthTwoFactorEnabledAudit).toHaveBeenCalledOnce()
  })

  it("records nothing for a code that does not match", async () => {
    const { browser } = await signedIn("enrol-wrong@marte.test", "198.51.100.67")
    await browser.post("/two-factor/enable", { password: CUSTOMER_PASSWORD })

    const response = await browser.post("/two-factor/verify-totp", { code: "000000" })

    expect(response.status).toBe(401)
    expect(audit.recordAuthTwoFactorEnabledAudit).not.toHaveBeenCalled()
  })

  it("is recorded as turned off", async () => {
    const { browser, userId } = await signedIn("disable@marte.test", "198.51.100.68")
    await turnOnTwoFactor(browser, userId)

    const response = await browser.post("/two-factor/disable", { password: CUSTOMER_PASSWORD })

    expect(response.status).toBe(200)
    expect(audit.recordAuthTwoFactorDisabledAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, { ip: "198.51.100.68" })
  })
})

describe("a change of e-mail address", () => {
  it("is recorded with the old and new address, and the new address as verified, once the link to the new address confirms it", async () => {
    const { browser, userId } = await signedIn("before@marte.test", "198.51.100.69")

    await browser.follow(await emailChangeLink("before@marte.test", "after@marte.test", "change-email-verification"))

    expect(audit.recordAuthEmailChangedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, {
      detail: "before@marte.test → after@marte.test",
      ip: "198.51.100.69",
      metadata: { changed: ["email"], new: { email: "after@marte.test" }, old: { email: "before@marte.test" } },
    })
    expect(audit.recordAuthEmailVerifiedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, { ip: "198.51.100.69" })
  })

  it("is recorded when the link is opened on a device that is not signed in", async () => {
    const userId = await createPasswordCustomer("phone-before@marte.test")

    await openAuthBrowser("198.51.100.70").follow(
      await emailChangeLink("phone-before@marte.test", "phone-after@marte.test", "change-email-verification"),
    )

    expect(audit.recordAuthEmailChangedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, {
      detail: "phone-before@marte.test → phone-after@marte.test",
      ip: "198.51.100.70",
      metadata: { changed: ["email"], new: { email: "phone-after@marte.test" }, old: { email: "phone-before@marte.test" } },
    })
  })

  it("is not recorded for the confirmation sent to the old address, which changes nothing yet", async () => {
    const { browser } = await signedIn("confirm-old@marte.test", "198.51.100.71")

    await browser.follow(await emailChangeLink("confirm-old@marte.test", "confirm-new@marte.test", "change-email-confirmation"))

    expect(audit.recordAuthEmailChangedAudit).not.toHaveBeenCalled()
    expect(audit.recordAuthEmailVerifiedAudit).not.toHaveBeenCalled()
  })

  it("is not recorded when a new account confirms its address", async () => {
    await openAuthBrowser("198.51.100.72").post("/sign-up/email", { email: "fresh@marte.test", name: "Ada", password: CUSTOMER_PASSWORD })
    const { secret } = await auth.$context

    await openAuthBrowser("198.51.100.72").follow(
      `${AUTH_BASE_URL}/verify-email?token=${await createEmailVerificationToken(secret, "fresh@marte.test")}`,
    )

    expect(audit.recordAuthEmailChangedAudit).not.toHaveBeenCalled()
  })
})

describe("devices a customer signs out through Better Auth's own endpoints", () => {
  it.each(["/revoke-other-sessions", "/revoke-sessions"])("are recorded for %s", async (path) => {
    const ip = path === "/revoke-sessions" ? "198.51.100.73" : "198.51.100.74"
    const { browser, userId } = await signedIn(`revoke${path.replaceAll("/", "-")}@marte.test`, ip)

    const response = await browser.post(path, {})

    expect(response.status).toBe(200)
    expect(audit.recordAuthSessionsRevokedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, { ip })
  })

  it("are recorded for a single device", async () => {
    const { browser, userId } = await signedIn("revoke-one@marte.test", "198.51.100.75")
    await openAuthBrowser("198.51.100.76").signIn("revoke-one@marte.test")

    const response = await browser.post("/revoke-session", { token: tokenOfSessionFrom("198.51.100.76") })

    expect(response.status).toBe(200)
    expect(audit.recordAuthSessionsRevokedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, { ip: "198.51.100.75" })
  })

  it("are not recorded for a request that is not signed in", async () => {
    const response = await openAuthBrowser("198.51.100.77").post("/revoke-sessions", {})

    expect(response.status).toBe(401)
    expect(audit.recordAuthSessionsRevokedAudit).not.toHaveBeenCalled()
  })
})

describe("an admin changing another account through Better Auth's admin endpoints", () => {
  it.each([
    {
      body: { banReason: "Chargebacks" },
      path: "/admin/ban-user",
      record: audit.recordAuthUserBannedAudit,
      recorded: { detail: "Chargebacks" },
    },
    { body: {}, path: "/admin/unban-user", record: audit.recordAuthUserUnbannedAudit, recorded: {} },
    { body: {}, path: "/admin/revoke-user-sessions", record: audit.recordAuthSessionsRevokedAudit, recorded: {} },
    {
      body: { newPassword: `${CUSTOMER_PASSWORD}-set` },
      path: "/admin/set-user-password",
      record: audit.recordAuthPasswordChangedAudit,
      recorded: {},
    },
  ])("credits $path to the admin, against the customer's account", async ({ body, path, record, recorded }) => {
    const slug = path.replaceAll("/", "-")
    const admin = await signedInAdmin(`admin${slug}@marte.test`, "203.0.113.10")
    const customerId = await createPasswordCustomer(`customer${slug}@marte.test`)

    const response = await admin.browser.post(path, { ...body, userId: customerId })

    expect(response.status).toBe(200)
    expect(record).toHaveBeenCalledExactlyOnceWith(`actor:${customerId}`, {
      actor: `actor:${admin.userId}`,
      ip: "203.0.113.10",
      ...recorded,
    })
  })

  it("records each change an admin makes to an account in one update", async () => {
    const admin = await signedInAdmin("admin-update@marte.test", "203.0.113.11")
    const customerId = await createPasswordCustomer("customer-update@marte.test")
    const credited = { actor: `actor:${admin.userId}`, ip: "203.0.113.11" }

    await admin.browser.post("/admin/update-user", {
      data: { banReason: "Fraud", banned: true, name: "Grace" },
      userId: customerId,
    })

    expect(audit.recordAuthUserBannedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${customerId}`, { ...credited, detail: "Fraud" })
    expect(audit.recordAuthUserUnbannedAudit).not.toHaveBeenCalled()

    await admin.browser.post("/admin/update-user", { data: { banned: false }, userId: customerId })

    expect(audit.recordAuthUserUnbannedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${customerId}`, credited)
  })

  it("records nothing for an update that touches no ban or address", async () => {
    const admin = await signedInAdmin("admin-rename@marte.test", "203.0.113.12")
    const customerId = await createPasswordCustomer("customer-rename@marte.test")

    const response = await admin.browser.post("/admin/update-user", { data: { name: "Grace" }, userId: customerId })

    expect(response.status).toBe(200)
    expect(audit.recordAuthUserBannedAudit).not.toHaveBeenCalled()
    expect(audit.recordAuthUserUnbannedAudit).not.toHaveBeenCalled()
    expect(audit.recordAuthEmailChangedAudit).not.toHaveBeenCalled()
  })

  it("records nothing when Better Auth refuses the change", async () => {
    const admin = await signedInAdmin("admin-self-ban@marte.test", "203.0.113.13")

    const response = await admin.browser.post("/admin/ban-user", { userId: admin.userId })

    expect(response.status).toBe(400)
    expect(audit.recordAuthUserBannedAudit).not.toHaveBeenCalled()
  })

  it("records nothing for an account that does not exist", async () => {
    const admin = await signedInAdmin("admin-missing@marte.test", "203.0.113.14")

    const response = await admin.browser.post("/admin/revoke-user-sessions", { userId: "no-such-account" })

    expect(response.status).toBe(200)
    expect(audit.recordAuthSessionsRevokedAudit).not.toHaveBeenCalled()
  })
})

describe("a deleted account", () => {
  it("is credited to the admin who removed it, as the customer delete action asks Better Auth to", async () => {
    const admin = await signedInAdmin("admin-remove@marte.test", "203.0.113.15")
    const customerId = await createPasswordCustomer("removed@marte.test")

    await auth.api.removeUser({
      body: { userId: customerId },
      headers: new Headers([...admin.browser.headers(), ["host", new URL(AUTH_BASE_URL).host]]),
    })

    expect(audit.recordCustomerDeletedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${customerId}`, {
      actor: `actor:${admin.userId}`,
      ip: "203.0.113.15",
    })
  })

  it("is credited to the customer who closed their own account", async () => {
    const { browser, userId } = await signedIn("closing@marte.test", "198.51.100.78")

    const response = await browser.post("/delete-user", { password: CUSTOMER_PASSWORD })

    expect(response.status).toBe(200)
    expect(audit.recordCustomerDeletedAudit).toHaveBeenCalledExactlyOnceWith(`actor:${userId}`, {
      actor: `actor:${userId}`,
      ip: "198.51.100.78",
    })
  })
})
