import { type ReactElement } from "react"

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { type AuthBrowser, createPasswordCustomer, openAuthBrowser } from "~/src/platform/testing/lib/auth-browser"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import passwordChangedCopy from "~/messages/en-US/emails.password-changed.json"
import resetPasswordCopy from "~/messages/en-US/emails.reset-password.json"

interface SentEmail {
  readonly react: ReactElement<Record<string, unknown>>
  readonly subject: string
  readonly to: string
}

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const stubs = vi.hoisted(() => ({
  recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string }) => void>(),
  sendEmail: vi.fn<(email: SentEmail) => Promise<string | undefined>>(),
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
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))
vi.mock("~/src/integrations/resend/resend.availability.server", () => ({ isEmailSenderUnavailable: () => Promise.resolve(false) }))
vi.mock("~/src/integrations/cloudflare-turnstile/turnstile.server", () => ({ passesTurnstile: () => Promise.resolve(true) }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  recordEmailFailedAudit: stubs.recordEmailFailedAudit,
  resolveAuthAuditActor: vi.fn(),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/order/order.claim.server", () => ({ claimGuestOrdersForUser: vi.fn(() => Promise.resolve(0)) }))
vi.mock("~/src/modules/newsletter/newsletter.accessors", () => ({ linkSubscriberToUser: vi.fn(() => Promise.resolve()) }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const NEW_PASSWORD = "a-new-horse-for-the-battery"

const DOMAIN_NOT_VERIFIED = "The marte.test domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const resetLink = z.object({ resetPasswordUrl: z.string() })

const signInLink = z.object({ name: z.string(), signInUrl: z.string() })

const sessionCount = z.object({ sessions: z.number() })

const countSessions = (userId: string): number =>
  sessionCount.parse(sqlite.prepare("select count(*) as sessions from session where user_id = ?").get(userId)).sessions

const waitForEmail = (address: string, subject: string): Promise<SentEmail> =>
  vi.waitFor(() => {
    const email = stubs.sendEmail.mock.calls.map(([sent]) => sent).findLast((sent) => sent.to === address && sent.subject === subject)
    if (email === undefined) {
      throw new Error(`No "${subject}" email reached ${address}`)
    }

    return email
  })

const resetPassword = async (address: string, browser: AuthBrowser): Promise<Response> => {
  await browser.post("/request-password-reset", { email: address, redirectTo: "/en-US/auth/reset-password" })
  const { react } = await waitForEmail(address, resetPasswordCopy.subject)
  const token = new URL(resetLink.parse(react.props).resetPasswordUrl).pathname.split("/").at(-1)

  return browser.post("/reset-password", { newPassword: NEW_PASSWORD, token })
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  stubs.sendEmail.mockReset()
  stubs.sendEmail.mockResolvedValue(undefined)
  stubs.recordEmailFailedAudit.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => {
  sqlite.close()
})

describe("a password reset", () => {
  it("signs out every device that was signed in to the account", async () => {
    const customerId = await createPasswordCustomer("laptop-and-phone@marte.test")
    const laptop = openAuthBrowser("198.51.100.60")
    const phone = openAuthBrowser("198.51.100.61")
    const laptopSignIn = await laptop.signIn("laptop-and-phone@marte.test")
    const phoneSignIn = await phone.signIn("laptop-and-phone@marte.test")

    const reset = await resetPassword("laptop-and-phone@marte.test", openAuthBrowser("198.51.100.62"))
    const laptopUpdate = await laptop.post("/update-user", { name: "Mallory" })
    const phoneUpdate = await phone.post("/update-user", { name: "Mallory" })

    expect([laptopSignIn.status, phoneSignIn.status, reset.status]).toStrictEqual([200, 200, 200])
    expect([laptopUpdate.status, phoneUpdate.status]).toStrictEqual([401, 401])
    expect(countSessions(customerId)).toBe(0)
    expect(sqlite.prepare("select name from user where id = ?").get(customerId)).toMatchObject({ name: "Ada" })
  })

  it("lets the customer back in with the new password", async () => {
    await createPasswordCustomer("back-in@marte.test")
    await resetPassword("back-in@marte.test", openAuthBrowser("198.51.100.63"))
    const browser = openAuthBrowser("198.51.100.64")

    const signIn = await browser.post("/sign-in/email", { email: "back-in@marte.test", password: NEW_PASSWORD })
    const update = await browser.post("/update-user", { name: "Ada Lovelace" })

    expect([signIn.status, update.status]).toStrictEqual([200, 200])
  })

  it("tells the customer the password was changed, linking to sign-in on the address the reset came in on", async () => {
    await createPasswordCustomer("told@marte.test")

    await resetPassword("told@marte.test", openAuthBrowser("198.51.100.65"))
    const { react } = await waitForEmail("told@marte.test", passwordChangedCopy.subject)

    expect(signInLink.parse(react.props)).toStrictEqual({ name: "Ada", signInUrl: "http://localhost:3000/en-US/auth/sign-in" })
  })

  it("still signs every device out and records the failure when that email is refused", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.sendEmail.mockImplementation(({ subject }) =>
      Promise.resolve(subject === passwordChangedCopy.subject ? DOMAIN_NOT_VERIFIED : undefined),
    )
    const customerId = await createPasswordCustomer("refused@marte.test")
    const laptop = openAuthBrowser("198.51.100.66")
    const signIn = await laptop.signIn("refused@marte.test")

    const reset = await resetPassword("refused@marte.test", openAuthBrowser("198.51.100.67"))
    const update = await laptop.post("/update-user", { name: "Mallory" })

    expect([signIn.status, reset.status, update.status]).toStrictEqual([200, 200, 401])
    expect(countSessions(customerId)).toBe(0)
    await vi.waitFor(() => {
      expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith("refused@marte.test", {
        detail: `Auth password-changed email — ${DOMAIN_NOT_VERIFIED}`,
      })
    })
  })
})
