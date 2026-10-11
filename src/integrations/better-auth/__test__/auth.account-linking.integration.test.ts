import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { AUTH_BASE_URL, createPasswordCustomer, openAuthBrowser } from "~/src/platform/testing/lib/auth-browser"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: vi.fn(() => Promise.resolve(undefined)) }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
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

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

const signInRedirect = z.object({ url: z.string() })

const accountRows = z.array(z.object({ provider_id: z.string() }))

const sessionCount = z.object({ sessions: z.number() })

const jwtSegment = (value: Readonly<Record<string, unknown>>): string => Buffer.from(JSON.stringify(value)).toString("base64url")

const googleIdToken = (email: string, emailVerified: boolean): string =>
  `${jwtSegment({ alg: "none" })}.${jwtSegment({
    aud: "test-google-client",
    email,
    email_verified: emailVerified,
    iss: "https://accounts.google.com",
    name: "Ada Google",
    sub: `google-${email}`,
  })}.`

const signInWithGoogle = async (ip: string, email: string, emailVerified: boolean): Promise<Response> => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: Request | URL | string) => {
      const { origin, pathname } = new URL(input instanceof Request ? input.url : input)
      if (`${origin}${pathname}` !== GOOGLE_TOKEN_ENDPOINT) {
        return Promise.reject(new Error(`Unexpected request to ${origin}${pathname}`))
      }

      return Promise.resolve(
        Response.json({ access_token: "ya29.test", expires_in: 3599, id_token: googleIdToken(email, emailVerified), token_type: "Bearer" }),
      )
    }),
  )
  const browser = openAuthBrowser(ip)
  const started = await browser.post("/sign-in/social", { callbackURL: "/en-US/account/overview", provider: "google" })
  const { url } = signInRedirect.parse(await started.json())

  return browser.follow(`${AUTH_BASE_URL}/callback/google?code=test-code&state=${new URL(url).searchParams.get("state")}`)
}

const providersOf = (customerId: string): string[] =>
  accountRows
    .parse(sqlite.prepare("select provider_id from account where user_id = ? order by provider_id").all(customerId))
    .map((row) => row.provider_id)

const sessionsOf = (customerId: string): number =>
  sessionCount.parse(sqlite.prepare("select count(*) as sessions from session where user_id = ?").get(customerId)).sessions

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

afterAll(() => {
  sqlite.close()
})

describe("a Google sign-in with the e-mail address of an existing shop account", () => {
  it("is refused and leaves the account untouched when Google has not verified the address", async () => {
    const customerId = await createPasswordCustomer("unverified@marte.test")

    const response = await signInWithGoogle("198.51.100.30", "unverified@marte.test", false)

    expect(response.headers.get("location")).toBe(`${AUTH_BASE_URL}/error?error=account_not_linked`)
    expect(providersOf(customerId)).toStrictEqual(["credential"])
    expect(sessionsOf(customerId)).toBe(0)
  })

  it("links to that account and signs the customer in when Google has verified the address", async () => {
    const customerId = await createPasswordCustomer("verified@marte.test")

    const response = await signInWithGoogle("198.51.100.31", "verified@marte.test", true)

    expect(response.headers.get("location")).toBe("/en-US/account/overview")
    expect(providersOf(customerId)).toStrictEqual(["credential", "google"])
    expect(sessionsOf(customerId)).toBe(1)
  })
})
