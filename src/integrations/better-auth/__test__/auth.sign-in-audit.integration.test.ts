import { type ReactElement } from "react"

import { createEmailVerificationToken } from "better-auth/api"
import { symmetricDecrypt } from "better-auth/crypto"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
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
  readonly react: ReactElement<{ readonly verificationUrl: string }>
  readonly to: string
}

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const audit = vi.hoisted(() => ({
  recordAuthLoginAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn((user: { id: string }) => `actor:${user.id}`),
}))

const mail = vi.hoisted(() => ({ sendEmail: vi.fn<(email: SentEmail) => Promise<undefined>>() }))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GITHUB_CLIENT_ID: "test-github-client",
    AUTH_GITHUB_CLIENT_SECRET: "test-github-secret",
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => mail)
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => audit)
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/order/order.claim.server", () => ({ claimGuestOrdersForUser: vi.fn(() => Promise.resolve(0)) }))
vi.mock("~/src/modules/newsletter/newsletter.accessors", () => ({ linkSubscriberToUser: vi.fn(() => Promise.resolve()) }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const GITHUB_RESPONSES: Readonly<Record<string, unknown>> = {
  "https://api.github.com/user": { avatar_url: null, email: null, id: 4242, login: "octo-ada", name: "Ada Octo" },
  "https://api.github.com/user/emails": [{ email: "github@marte.test", primary: true, verified: true }],
  "https://github.com/login/oauth/access_token": { access_token: "gho_test", scope: "read:user,user:email", token_type: "bearer" },
}

const signInRedirect = z.object({ url: z.string() })

const twoFactorEnrolment = z.object({ backupCodes: z.tuple([z.string()], z.string()) })

const userRow = z.object({ id: z.string() })

const twoFactorRow = z.object({ secret: z.string() })

const userIdFor = (email: string): string => userRow.parse(sqlite.prepare("select id from user where email = ?").get(email)).id

const currentCode = async (customerId: string): Promise<string> => {
  const row = twoFactorRow.parse(sqlite.prepare("select secret from two_factor where user_id = ?").get(customerId))
  const context = await auth.$context
  const secret = await symmetricDecrypt({ data: row.secret, key: context.secretConfig })
  const { code } = await auth.api.generateTOTP({ body: { secret }, headers: new Headers({ host: new URL(AUTH_BASE_URL).host }) })

  return code
}

const turnOnTwoFactor = async (
  browser: AuthBrowser,
  customerId: string,
): Promise<Readonly<{ backupCodes: [string, ...string[]]; verified: Response }>> => {
  const enabled = await browser.post("/two-factor/enable", { password: CUSTOMER_PASSWORD })
  const { backupCodes } = twoFactorEnrolment.parse(await enabled.json())
  const verified = await browser.post("/two-factor/verify-totp", { code: await currentCode(customerId) })

  return { backupCodes, verified }
}

const sentEmail = (): Promise<SentEmail> =>
  vi.waitFor(() => {
    const call = mail.sendEmail.mock.lastCall
    if (call === undefined) {
      throw new Error("No e-mail has been sent yet")
    }

    return call[0]
  })

const expectOneLogin = (actorId: string, ip: string): void => {
  expect(audit.recordAuthLoginAudit).toHaveBeenCalledTimes(1)
  expect(audit.recordAuthLoginAudit).toHaveBeenCalledWith(`actor:${actorId}`, { ip, resourceId: actorId })
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  mail.sendEmail.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

afterAll(() => {
  sqlite.close()
})

describe("a password sign-in", () => {
  it("records one login against the customer, from the address it came from", async () => {
    const customerId = await createPasswordCustomer("password@marte.test")

    const response = await openAuthBrowser("198.51.100.10").signIn("password@marte.test")

    expect(response.status).toBe(200)
    expectOneLogin(customerId, "198.51.100.10")
  })

  it("records another login when the customer signs in again on a browser that is still signed in", async () => {
    const customerId = await createPasswordCustomer("again@marte.test")
    const browser = openAuthBrowser("198.51.100.15")
    await browser.signIn("again@marte.test")
    audit.recordAuthLoginAudit.mockClear()

    const response = await browser.signIn("again@marte.test")

    expect(response.status).toBe(200)
    expectOneLogin(customerId, "198.51.100.15")
  })
})

describe("account changes that replace or re-issue the session", () => {
  it("record no login when changing the password signs the other devices out", async () => {
    await createPasswordCustomer("rotate@marte.test")
    const browser = openAuthBrowser("198.51.100.11")
    await browser.signIn("rotate@marte.test")
    audit.recordAuthLoginAudit.mockClear()

    const response = await browser.post("/change-password", {
      currentPassword: CUSTOMER_PASSWORD,
      newPassword: `${CUSTOMER_PASSWORD}-renewed`,
      revokeOtherSessions: true,
    })

    expect(response.status).toBe(200)
    expect(audit.recordAuthLoginAudit).not.toHaveBeenCalled()
  })

  it("record no login while the customer turns two-factor on", async () => {
    const customerId = await createPasswordCustomer("enrol@marte.test")
    const browser = openAuthBrowser("198.51.100.12")
    await browser.signIn("enrol@marte.test")
    audit.recordAuthLoginAudit.mockClear()

    const { verified } = await turnOnTwoFactor(browser, customerId)

    expect(verified.status).toBe(200)
    expect(sqlite.prepare("select two_factor_enabled from user where id = ?").get(customerId)).toMatchObject({ two_factor_enabled: 1 })
    expect(audit.recordAuthLoginAudit).not.toHaveBeenCalled()
  })

  it("record no login when the customer turns two-factor off", async () => {
    const customerId = await createPasswordCustomer("disable@marte.test")
    const browser = openAuthBrowser("198.51.100.24")
    await browser.signIn("disable@marte.test")
    await turnOnTwoFactor(browser, customerId)
    audit.recordAuthLoginAudit.mockClear()

    const response = await browser.post("/two-factor/disable", { password: CUSTOMER_PASSWORD })

    expect(response.status).toBe(200)
    expect(sqlite.prepare("select two_factor_enabled from user where id = ?").get(customerId)).toMatchObject({ two_factor_enabled: 0 })
    expect(audit.recordAuthLoginAudit).not.toHaveBeenCalled()
  })

  it("record no login when the signed-in customer confirms a new e-mail address", async () => {
    const customerId = await createPasswordCustomer("before@marte.test")
    const browser = openAuthBrowser("198.51.100.16")
    await browser.signIn("before@marte.test")
    audit.recordAuthLoginAudit.mockClear()
    const { secret } = await auth.$context
    const token = await createEmailVerificationToken(secret, "before@marte.test", "after@marte.test", 3600, {
      requestType: "change-email-verification",
    })

    const response = await browser.follow(`${AUTH_BASE_URL}/verify-email?token=${token}`)

    expect(response.status).toBe(200)
    expect(userIdFor("after@marte.test")).toBe(customerId)
    expect(audit.recordAuthLoginAudit).not.toHaveBeenCalled()
  })
})

describe("a two-factor sign-in", () => {
  it("records one login, when the code completes it", async () => {
    const customerId = await createPasswordCustomer("two-factor@marte.test")
    const enrolled = openAuthBrowser("198.51.100.13")
    await enrolled.signIn("two-factor@marte.test")
    await turnOnTwoFactor(enrolled, customerId)
    const browser = openAuthBrowser("198.51.100.14")
    audit.recordAuthLoginAudit.mockClear()

    const challenge = await browser.signIn("two-factor@marte.test")

    await expect(challenge.json()).resolves.toMatchObject({ twoFactorRedirect: true })
    expect(audit.recordAuthLoginAudit).not.toHaveBeenCalled()

    const completed = await browser.post("/two-factor/verify-totp", { code: await currentCode(customerId) })

    expect(completed.status).toBe(200)
    expectOneLogin(customerId, "198.51.100.14")
  })

  it("records one login when a backup code completes it", async () => {
    const customerId = await createPasswordCustomer("backup@marte.test")
    const enrolled = openAuthBrowser("198.51.100.25")
    await enrolled.signIn("backup@marte.test")
    const {
      backupCodes: [backupCode],
    } = await turnOnTwoFactor(enrolled, customerId)
    const browser = openAuthBrowser("198.51.100.26")
    await browser.signIn("backup@marte.test")
    audit.recordAuthLoginAudit.mockClear()

    const response = await browser.post("/two-factor/verify-backup-code", { code: backupCode })

    expect(response.status).toBe(200)
    expectOneLogin(customerId, "198.51.100.26")
  })
})

describe("signing in without a password", () => {
  it("records the first sign-in of a new customer when the verification link signs them in", async () => {
    const browser = openAuthBrowser("198.51.100.17")
    const signUp = await browser.post("/sign-up/email", { email: "new@marte.test", name: "Ada", password: CUSTOMER_PASSWORD })

    const verification = await sentEmail()

    expect(signUp.status).toBe(200)
    expect(verification.to).toBe("new@marte.test")
    expect(audit.recordAuthLoginAudit).not.toHaveBeenCalled()

    const response = await browser.follow(verification.react.props.verificationUrl)

    expect(response.status).toBe(302)
    expectOneLogin(userIdFor("new@marte.test"), "198.51.100.17")
  })

  it("records a GitHub sign-in when the provider sends the customer back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: Request | URL | string) => {
        const { origin, pathname } = new URL(input instanceof Request ? input.url : input)

        return Promise.resolve(Response.json(GITHUB_RESPONSES[`${origin}${pathname}`]))
      }),
    )
    const browser = openAuthBrowser("198.51.100.18")
    const started = await browser.post("/sign-in/social", { callbackURL: "/en-US/account/overview", provider: "github" })
    const { url } = signInRedirect.parse(await started.json())

    const response = await browser.follow(`${AUTH_BASE_URL}/callback/github?code=test-code&state=${new URL(url).searchParams.get("state")}`)

    expect(response.headers.get("location")).toBe("/en-US/account/overview")
    expectOneLogin(userIdFor("github@marte.test"), "198.51.100.18")
  })
})
