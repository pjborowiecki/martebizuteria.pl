import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { AUTH_BASE_URL, type AuthBrowser, openAuthBrowser } from "~/src/platform/testing/lib/auth-browser"
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
vi.mock("~/src/modules/audit-log/audit-log.utils", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  resolveAuthAuditActor: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/use-cases/record-auth-audit.server", () => ({
  recordAuthLoginAudit: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/use-cases/record-customer-audit.server", () => ({
  recordCustomerRegisteredAudit: vi.fn(),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/order/use-cases/claim-guest-orders.server", () => ({ claimGuestOrdersForUser: vi.fn(() => Promise.resolve(0)) }))
vi.mock("~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors", () => ({
  linkSubscriberToUser: vi.fn(() => Promise.resolve()),
}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { auth } from "~/src/integrations/better-auth/auth.server"

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

const NEW_PASSWORD = "GooglePassword1!"

const signInRedirect = z.object({ url: z.string() })

const accountRows = z.array(z.object({ provider_id: z.string() }))

const userRow = z.object({ id: z.string() })

const jwtSegment = (value: Readonly<Record<string, unknown>>): string => Buffer.from(JSON.stringify(value)).toString("base64url")

const googleIdToken = (email: string): string =>
  `${jwtSegment({ alg: "none" })}.${jwtSegment({
    aud: "test-google-client",
    email,
    email_verified: true,
    iss: "https://accounts.google.com",
    name: "Ada Google",
    sub: `google-${email}`,
  })}.`

const signInWithGoogle = async (ip: string, email: string): Promise<AuthBrowser> => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: Request | URL | string) => {
      const { origin, pathname } = new URL(input instanceof Request ? input.url : input)
      if (`${origin}${pathname}` !== GOOGLE_TOKEN_ENDPOINT) {
        return Promise.reject(new Error(`Unexpected request to ${origin}${pathname}`))
      }

      return Promise.resolve(
        Response.json({ access_token: "ya29.test", expires_in: 3599, id_token: googleIdToken(email), token_type: "Bearer" }),
      )
    }),
  )
  const browser = openAuthBrowser(ip)
  const started = await browser.post("/sign-in/social", { callbackURL: "/en-US/account/overview", provider: "google" })
  const { url } = signInRedirect.parse(await started.json())
  await browser.follow(`${AUTH_BASE_URL}/callback/google?code=test-code&state=${new URL(url).searchParams.get("state")}`)

  return browser
}

const requestHeaders = (browser: AuthBrowser): Headers => {
  const headers = browser.headers()
  headers.set("host", new URL(AUTH_BASE_URL).host)

  return headers
}

const providersOf = (email: string): string[] => {
  const { id } = userRow.parse(sqlite.prepare("select id from user where email = ?").get(email))

  return accountRows
    .parse(sqlite.prepare("select provider_id from account where user_id = ? order by provider_id").all(id))
    .map((row) => row.provider_id)
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

afterAll(() => {
  sqlite.close()
})

describe("setting a first password on an account created with Google", () => {
  it("adds a password sign-in next to Google for the signed-in account", async () => {
    const browser = await signInWithGoogle("198.51.100.60", "google-only@marte.test")
    expect(providersOf("google-only@marte.test")).toStrictEqual(["google"])

    await expect(auth.api.setPassword({ body: { newPassword: NEW_PASSWORD }, headers: requestHeaders(browser) })).resolves.toStrictEqual({
      status: true,
    })

    expect(providersOf("google-only@marte.test")).toStrictEqual(["credential", "google"])
    const signIn = await openAuthBrowser("198.51.100.61").post("/sign-in/email", {
      email: "google-only@marte.test",
      password: NEW_PASSWORD,
    })
    expect(signIn.status).toBe(200)
  })

  it("refuses a second password, so the endpoint never replaces an existing one", async () => {
    const browser = await signInWithGoogle("198.51.100.62", "google-twice@marte.test")
    await auth.api.setPassword({ body: { newPassword: NEW_PASSWORD }, headers: requestHeaders(browser) })

    await expect(
      auth.api.setPassword({ body: { newPassword: "AnotherPassword1!" }, headers: requestHeaders(browser) }),
    ).rejects.toMatchObject({
      body: { code: "PASSWORD_ALREADY_SET" },
    })
    expect(providersOf("google-twice@marte.test")).toStrictEqual(["credential", "google"])
  })

  it("needs a signed-in session", async () => {
    const signedOut = requestHeaders(openAuthBrowser("198.51.100.63"))

    await expect(auth.api.setPassword({ body: { newPassword: NEW_PASSWORD }, headers: signedOut })).rejects.toMatchObject({
      body: { code: "UNAUTHORIZED" },
    })
  })
})
