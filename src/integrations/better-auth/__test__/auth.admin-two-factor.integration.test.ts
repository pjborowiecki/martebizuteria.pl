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

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const audit = vi.hoisted(() => ({
  recordAuthLoginAudit: vi.fn(),
  recordAuthTwoFactorEnabledAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn((user: { id: string }) => `actor:${user.id}`),
}))

const turnstile = vi.hoisted(() => ({ passesTurnstile: vi.fn(() => Promise.resolve(false)) }))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: vi.fn(() => Promise.resolve()) }))
vi.mock("~/src/integrations/cloudflare-turnstile/turnstile.server", () => turnstile)
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => audit)
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

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

const ACCOUNT_OVERVIEW = "/en-US/account/overview"

const signInRedirect = z.object({ url: z.string() })

const sessionCount = z.object({ sessions: z.number() })

const errorBody = z.object({ code: z.string() })

const twoFactorChallenge = z.object({ twoFactorRedirect: z.literal(true) })

const twoFactorRow = z.object({ secret: z.string() })

const base64Url = (value: Readonly<Record<string, unknown>>): string => Buffer.from(JSON.stringify(value)).toString("base64url")

const googleIdToken = (email: string): string =>
  [
    base64Url({ alg: "RS256", kid: "test-key", typ: "JWT" }),
    base64Url({
      aud: "test-google-client",
      email,
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      iss: "https://accounts.google.com",
      name: "Ada Google",
      sub: `google-${email}`,
    }),
    "signature",
  ].join(".")

const answerAsGoogleFor = (email: string): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: Request | URL | string) => {
      const { origin, pathname } = new URL(input instanceof Request ? input.url : input)
      if (`${origin}${pathname}` !== GOOGLE_TOKEN_ENDPOINT) {
        return Promise.resolve(Response.json({ error: "unexpected request" }, { status: 404 }))
      }

      return Promise.resolve(
        Response.json({ access_token: "ya29.test", expires_in: 3600, id_token: googleIdToken(email), token_type: "Bearer" }),
      )
    }),
  )
}

const signInWithGoogle = async (browser: AuthBrowser, email: string): Promise<Response> => {
  answerAsGoogleFor(email)
  const started = await browser.post("/sign-in/social", { callbackURL: ACCOUNT_OVERVIEW, provider: "google" })
  const { url } = signInRedirect.parse(await started.json())

  return browser.follow(`${AUTH_BASE_URL}/callback/google?code=test-code&state=${new URL(url).searchParams.get("state")}`)
}

const redirectTarget = (response: Response): URL => {
  const location = response.headers.get("location")
  if (location === null) {
    throw new Error(`Expected a redirect, got ${String(response.status)}`)
  }

  return new URL(location, AUTH_BASE_URL)
}

const sessionsOf = (userId: string): number =>
  sessionCount.parse(sqlite.prepare("select count(*) as sessions from session where user_id = ?").get(userId)).sessions

const promoteToAdmin = (userId: string): void => {
  sqlite.prepare("update user set role = 'admin' where id = ?").run(userId)
}

const recordTwoFactor = (userId: string): void => {
  sqlite.prepare("update user set two_factor_enabled = 1 where id = ?").run(userId)
}

const currentCode = async (userId: string): Promise<string> => {
  const row = twoFactorRow.parse(sqlite.prepare("select secret from two_factor where user_id = ?").get(userId))
  const context = await auth.$context
  const secret = await symmetricDecrypt({ data: row.secret, key: context.secretConfig })
  const { code } = await auth.api.generateTOTP({ body: { secret }, headers: new Headers({ host: new URL(AUTH_BASE_URL).host }) })

  return code
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

afterAll(() => {
  sqlite.close()
})

describe("Google sign-in, which two-factor authentication does not cover", () => {
  it("is refused for an admin, who is sent to the error page with the reason and gets no session", async () => {
    const adminId = await createPasswordCustomer("google-admin@marte.test")
    promoteToAdmin(adminId)

    const response = await signInWithGoogle(openAuthBrowser("198.51.100.40"), "google-admin@marte.test")

    const location = redirectTarget(response)
    expect(response.status).toBe(302)
    expect(location.pathname).toBe("/api/auth/error")
    expect(location.searchParams.get("error")).toBe("ADMIN_PASSWORD_SIGN_IN_REQUIRED")
    expect(sessionsOf(adminId)).toBe(0)
    expect(audit.recordAuthLoginAudit).not.toHaveBeenCalled()
  })

  it("is refused for an admin who has already turned two-factor authentication on", async () => {
    const adminId = await createPasswordCustomer("google-enrolled-admin@marte.test")
    promoteToAdmin(adminId)
    recordTwoFactor(adminId)

    const response = await signInWithGoogle(openAuthBrowser("198.51.100.41"), "google-enrolled-admin@marte.test")

    expect(redirectTarget(response).searchParams.get("error")).toBe("ADMIN_PASSWORD_SIGN_IN_REQUIRED")
    expect(sessionsOf(adminId)).toBe(0)
  })

  it("still signs a customer in and sends them back to the page they started from", async () => {
    const customerId = await createPasswordCustomer("google-customer@marte.test")

    const response = await signInWithGoogle(openAuthBrowser("198.51.100.42"), "google-customer@marte.test")

    expect(response.headers.get("location")).toBe(ACCOUNT_OVERVIEW)
    expect(sessionsOf(customerId)).toBe(1)
  })
})

describe("a password sign-in for an admin", () => {
  it("still opens a session while two-factor authentication is off, so the admin can reach the setup page", async () => {
    const adminId = await createPasswordCustomer("password-admin@marte.test")
    promoteToAdmin(adminId)

    const response = await openAuthBrowser("198.51.100.43").signIn("password-admin@marte.test")

    expect(response.status).toBe(200)
    expect(sessionsOf(adminId)).toBe(1)
  })
})

describe("Better Auth's own admin endpoints", () => {
  it("refuse an admin who has not turned on two-factor authentication", async () => {
    const adminId = await createPasswordCustomer("endpoint-admin@marte.test")
    promoteToAdmin(adminId)
    const browser = openAuthBrowser("198.51.100.44")
    await browser.signIn("endpoint-admin@marte.test")

    const response = await browser.follow(`${AUTH_BASE_URL}/admin/list-users`)

    expect(response.status).toBe(403)
    expect(errorBody.parse(await response.json()).code).toBe("ADMIN_TWO_FACTOR_REQUIRED")
  })

  it("answer the same admin once two-factor authentication is on", async () => {
    const adminId = await createPasswordCustomer("enrolled-endpoint-admin@marte.test")
    promoteToAdmin(adminId)
    const browser = openAuthBrowser("198.51.100.45")
    await browser.signIn("enrolled-endpoint-admin@marte.test")
    recordTwoFactor(adminId)

    const response = await browser.follow(`${AUTH_BASE_URL}/admin/list-users`)

    expect(response.status).toBe(200)
  })

  it("leave a customer to the plugin's own refusal", async () => {
    await createPasswordCustomer("endpoint-customer@marte.test")
    const browser = openAuthBrowser("198.51.100.46")
    await browser.signIn("endpoint-customer@marte.test")

    const response = await browser.follow(`${AUTH_BASE_URL}/admin/list-users`)

    expect(response.status).toBe(403)
    expect(errorBody.parse(await response.json()).code).not.toBe("ADMIN_TWO_FACTOR_REQUIRED")
  })
})

describe("two-factor enrolment and sign-in, which the bot check never asks about", () => {
  it("lets an admin turn two-factor authentication on and sign in with a code while Turnstile refuses every token", async () => {
    const adminId = await createPasswordCustomer("enrolling-admin@marte.test")
    promoteToAdmin(adminId)
    const browser = openAuthBrowser("198.51.100.47")
    await browser.signIn("enrolling-admin@marte.test")

    const enabled = await browser.post("/two-factor/enable", { password: CUSTOMER_PASSWORD })
    const verified = await browser.post("/two-factor/verify-totp", { code: await currentCode(adminId) })
    const adminEndpoint = await browser.follow(`${AUTH_BASE_URL}/admin/list-users`)

    expect([enabled.status, verified.status, adminEndpoint.status]).toStrictEqual([200, 200, 200])

    const nextDevice = openAuthBrowser("198.51.100.48")
    const challenged = await nextDevice.signIn("enrolling-admin@marte.test")
    const completed = await nextDevice.post("/two-factor/verify-totp", { code: await currentCode(adminId) })
    const nextAdminEndpoint = await nextDevice.follow(`${AUTH_BASE_URL}/admin/list-users`)

    expect(twoFactorChallenge.parse(await challenged.json()).twoFactorRedirect).toBe(true)
    expect([completed.status, nextAdminEndpoint.status]).toStrictEqual([200, 200])
    expect(turnstile.passesTurnstile).not.toHaveBeenCalled()
  })
})
