import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const stubs = vi.hoisted(() => ({
  sendEmail: vi.fn<(email: { readonly to: string }) => Promise<string | undefined>>(),
}))

vi.mock("cloudflare:workers", () => ({
  env: {
    APP_ENV: "test",
    AUTH_GITHUB_CLIENT_ID: "test-github-client",
    AUTH_GITHUB_CLIENT_SECRET: "test-github-secret",
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
    TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))
vi.mock("~/src/integrations/resend/resend.availability.server", () => ({ isEmailSenderUnavailable: () => Promise.resolve(false) }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  recordEmailFailedAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn(),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: vi.fn(),
}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"
import { installProviderMocks } from "~/src/platform/testing/mocks/providers"

import { auth } from "~/src/integrations/better-auth/auth.server"
import { TURNSTILE_TESTING_KEYS, TURNSTILE_TOKEN_HEADER } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"

const PASSWORD = "Sup3rSecret!"

const nativeFetch = globalThis.fetch

const errorBody = z.object({ code: z.string() })

const clientAddress = { next: 0 }

const post = (path: string, body: object, turnstileToken?: string): Promise<Response> => {
  clientAddress.next += 1

  return auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "cf-connecting-ip": `198.51.100.${String(clientAddress.next)}`,
        ...(turnstileToken === undefined ? {} : { [TURNSTILE_TOKEN_HEADER]: turnstileToken }),
      },
      method: "POST",
    }),
  )
}

const signUp = (email: string, turnstileToken?: string): Promise<Response> =>
  post("/sign-up/email", { email, name: "Anna Kowalska", password: PASSWORD }, turnstileToken)

const countUsers = (): number => z.object({ total: z.number() }).parse(sqlite.prepare("select count(*) as total from user").get()).total

const refusal = async (response: Response): Promise<{ readonly code: string; readonly status: number }> => ({
  code: errorBody.parse(await response.json()).code,
  status: response.status,
})

const BOT_CHECK_REFUSAL = { code: "BOT_CHECK_FAILED", status: 403 }

beforeAll(() => {
  applyMigrationHistory(sqlite)
  installProviderMocks()
})

beforeEach(() => {
  sqlite.exec("delete from user; delete from verification; delete from rate_limit;")
  stubs.sendEmail.mockReset()
  stubs.sendEmail.mockResolvedValue(undefined)
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => {
  globalThis.fetch = nativeFetch
  sqlite.close()
})

describe("the bot check in front of sign-up", () => {
  it.each([
    ["without a token", undefined],
    ["with a token Turnstile did not issue", "forged-token"],
  ])("creates no account and sends nothing for a sign-up %s", async (_label, turnstileToken) => {
    const response = await signUp("anna@example.com", turnstileToken)

    expect(await refusal(response)).toStrictEqual(BOT_CHECK_REFUSAL)
    expect(countUsers()).toBe(0)
    expect(stubs.sendEmail).not.toHaveBeenCalled()
  })

  it("creates the account and sends the verification email once the token passes", async () => {
    const response = await signUp("anna@example.com", TURNSTILE_TESTING_KEYS.DUMMY_TOKEN)

    expect(response.status).toBe(200)
    expect(countUsers()).toBe(1)
    await vi.waitFor(() => {
      expect(stubs.sendEmail).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: "anna@example.com" }))
    })
  })
})

describe("the bot check in front of the emails about an existing account", () => {
  it.each([
    ["/request-password-reset", { email: "anna@example.com", redirectTo: "/en-US/auth/reset-password" }],
    ["/send-verification-email", { email: "anna@example.com" }],
  ])("refuses %s with a forged token alike for a known and an unknown address, and sends nothing", async (path, body) => {
    await signUp("anna@example.com", TURNSTILE_TESTING_KEYS.DUMMY_TOKEN)
    await vi.waitFor(() => {
      expect(stubs.sendEmail).toHaveBeenCalledOnce()
    })

    const known = await post(path, body, "forged-token")
    const unknown = await post(path, { ...body, email: "nobody@example.com" }, "forged-token")

    expect(await refusal(known)).toStrictEqual(BOT_CHECK_REFUSAL)
    expect(await refusal(unknown)).toStrictEqual(BOT_CHECK_REFUSAL)
    expect(stubs.sendEmail).toHaveBeenCalledOnce()
  })

  it.each([
    ["/request-password-reset", { email: "anna@example.com", redirectTo: "/en-US/auth/reset-password" }],
    ["/send-verification-email", { email: "anna@example.com" }],
  ])("sends the email for %s once the token passes", async (path, body) => {
    await signUp("anna@example.com", TURNSTILE_TESTING_KEYS.DUMMY_TOKEN)

    const response = await post(path, body, TURNSTILE_TESTING_KEYS.DUMMY_TOKEN)

    expect(response.status).toBe(200)
    await vi.waitFor(() => {
      expect(stubs.sendEmail).toHaveBeenCalledTimes(2)
    })
  })
})
